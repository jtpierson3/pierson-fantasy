import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getLeagueStandings } from '@/lib/leagueStandings'
import { selectClosestGameweekForCompetition } from '@/lib/gameweekSelection'
import ClubSummaryTile from '@/app/components/tiles/ClubSummaryTile'
import CurrentCompetitionTile from '@/app/components/tiles/CurrentCompetitionTile'
import LatestLineupTile from '@/app/components/tiles/LatestLineupTile'
import { getCurrentWaiverWindow } from '@/lib/fixtureTiming'
import WaiverClaimsTile from '@/app/components/tiles/WaiverClaimsTile'
import LeagueActivityTile from '@/app/components/tiles/LeagueActivityTile'
import NextFixturesTile from '@/app/components/tiles/NextFixturesTile'
import { COMPETITIONS } from '@/lib/sportmonksConstants'
import SidelinedTile from '@/app/components/tiles/SidelinedTile'
import { GameweekWithDateRange } from '@/lib/gameweekSelection'

export default async function FootballDashobard() {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) redirect('/sign-in')

    const myTeam = await prisma.fantasyTeam.findFirst({
        where: { userId: user.id },
        include: { fantasyLeague: true }
    })

    if (!myTeam) {
        return (
            <div className="p-6">
                <p className="text-sm text-gray-500">No Fantasy Team Found</p>
            </div>
        )
    }

    const leagueTeams = await prisma.fantasyTeam.findMany({
        where: { fantasyLeagueId: myTeam.fantasyLeagueId },
        select: { id: true, totalLeaguePoints: true, totalFantasyPoints: true }
    })

    const standings = getLeagueStandings(leagueTeams)
    const myRank = standings.find(s => s.team.id === myTeam.id)?.rank ?? null

    // Determine which gameweek's matchup to show, based on date proximity
    const allGameweeks = await prisma.fantasyGameweek.findMany({
        where: { fantasyLeagueId: myTeam.fantasyLeagueId },
        select: { id: true, gameweekNumber: true, startDate: true, endDate: true, competition: true },
        orderBy: { startDate: 'asc' }
    })

    const now = new Date()
    const closestPremLeagueGameweek = selectClosestGameweekForCompetition(allGameweeks, 'premier_league', now)
    const closestDomCupGameweek = selectClosestGameweekForCompetition(allGameweeks, 'domestic_cup', now)
    const closestLeagueCupGameweek = selectClosestGameweekForCompetition(allGameweeks, 'league_cup', now)

    const RELEVANT_WINDOW_DAYS = 7
    function isCurrentlyRelevant(gw: GameweekWithDateRange) {
        const windowStart = new Date(gw.startDate.getTime() - RELEVANT_WINDOW_DAYS * 86400000)
        const windowEnd = new Date(gw.endDate.getTime() + RELEVANT_WINDOW_DAYS * 86400000)
        return now >= windowStart && now <= windowEnd
    }

    const cupSlides = await Promise.all(
        [
            { gw: closestLeagueCupGameweek, competition: 'league_cup' as const },
            { gw: closestDomCupGameweek, competition: 'domestic_cup' as const },
        ]
            .filter((entry): entry is { gw: GameweekWithDateRange; competition: 'league_cup' | 'domestic_cup' } =>
                entry.gw !== null && isCurrentlyRelevant(entry.gw)
            )
            .map(async ({ gw, competition }) => {
                const snapshot = await prisma.gameweekLineup.findUnique({
                    where: { fantasyTeamId_gameweekId: { fantasyTeamId: myTeam.id, gameweekId: gw.id } },
                    select: { cupPointsTotal: true }
                })
                return {
                    competition,
                    gameweekNumber: gw.gameweekNumber,
                    cupPointsTotal: snapshot?.cupPointsTotal ?? null
                }
            })
    )

    const closestGameweek = closestPremLeagueGameweek

    const currentMatchup = closestGameweek
        ? await prisma.fantasyMatchup.findFirst({
            where: {
                gameweekId: closestGameweek.id,
                OR: [
                    { homeTeamId: myTeam.id },
                    { awayTeamId: myTeam.id }
                ]
            },
            select: {
                id: true,
                homePoints: true,
                awayPoints: true,
                isComplete: true,
                homeTeamId: true,
                awayTeamId: true,
                gameweek: { select: { gameweekNumber: true } },
                homeTeam: { select: { id: true, name: true, user: { select: { username: true } } } },
                awayTeam: { select: { id: true, name: true, user: { select: { username: true } } } }
            }
        })
        : null

    const closestGameweekSnapshot = closestGameweek
        ? await prisma.gameweekLineup.findUnique({
            where: {
                fantasyTeamId_gameweekId: {
                    fantasyTeamId: myTeam.id,
                    gameweekId: closestGameweek.id
                }
            },
            include: {
                players: {
                    include: { player: { include: { team: true } } }
                }
            }
        })
        : null

    const lineupPlayers = (closestGameweekSnapshot?.players ?? []).map(p => ({
        id: p.id,
        playerId: p.playerId,
        rosterSlot: p.rosterSlot,
        slotOrder: p.slotOrder,
        player: p.player
    }))

    const pendingClaimsCount = await prisma.waiverClaim.count({
        where: { fantasyTeamId: myTeam.id, status: 'pending' }
    })

    const waiverWindow = await getCurrentWaiverWindow()
    
    const recentClaimsRaw = await prisma.waiverClaim.findMany({
        where: {
            status: 'won',
            fantasyTeam: { fantasyLeagueId: myTeam.fantasyLeagueId }
        },
        include: {
            fantasyTeam: true,
            playerToAdd: true,
            playerToDrop: true
        },
        orderBy: { processedAt: 'desc' },
        take: 20,
    })

    const bidsRaw = await prisma.transferBid.findMany({
        where: {
            fantasyTeam: { fantasyLeagueId: myTeam.fantasyLeagueId },
            OR: [
                { status: 'pending' },
                { status: { in: ['won', 'lost'] }, processedAt: { not: null } },
            ],
        },
        include: { fantasyTeam: true, player: true },
        orderBy: [{ amount: 'desc' }, { submittedAt: 'desc' }],
        take: 40,
    })

    const bidDropIds = Array.from(
        new Set(bidsRaw.map(b => b.playerToDropId).filter((v): v is number => v !== null))
    )
    const bidDropPlayers = bidDropIds.length
        ? await prisma.player.findMany({
            where: { id: { in: bidDropIds } },
            select: { id: true, display_name: true },
        })
        : []
    const dropNameById = new Map(bidDropPlayers.map(p => [p.id, p.display_name]))

    const leadingPendingByPlayer = new Map<number, (typeof bidsRaw)[number]>()
    for (const b of bidsRaw) {
        if (b.status !== 'pending') continue
        const existing = leadingPendingByPlayer.get(b.playerId)
        if (!existing || b.amount > existing.amount) leadingPendingByPlayer.set(b.playerId, b)
    }

    type ActivityItem = {
        id: string
        kind: 'claim' | 'bid'
        teamName: string
        playerAddedName: string
        playerDroppedName: string | null
        processedAt: string
        amount: number | null
        bidStatus: 'pending' | 'won' | 'lost' | null
    }

    const claimItems: ActivityItem[] = recentClaimsRaw.map(claim => ({
        id: `claim:${claim.id}`,
        kind: 'claim',
        teamName: claim.fantasyTeam.name,
        playerAddedName: claim.playerToAdd.display_name,
        playerDroppedName: claim.playerToDrop?.display_name ?? null,
        processedAt: claim.processedAt?.toISOString() ?? claim.submittedAt.toISOString(),
        amount: null,
        bidStatus: null,
    }))

    const bidItems: ActivityItem[] = bidsRaw
        .filter(b =>
            b.status === 'pending'
                ? leadingPendingByPlayer.get(b.playerId)?.id === b.id
                : true
        )
        .map(b => ({
            id: `bid:${b.id}`,
            kind: 'bid',
            teamName: b.fantasyTeam.name,
            playerAddedName: b.player.display_name,
            playerDroppedName: b.playerToDropId ? dropNameById.get(b.playerToDropId) ?? null : null,
            processedAt: (b.processedAt ?? b.submittedAt).toISOString(),
            amount: b.amount,
            bidStatus: b.status as 'pending' | 'won' | 'lost',
        }))

    const recentActivity = [...claimItems, ...bidItems].sort(
        (a,b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
    )

    const upcomingFixturesRaw = await prisma.fixture.findMany({
        where: {
            kickoff: { gt: new Date() },
            OR: [
                { homeTeam: { leagueId: COMPETITIONS.premier_league.leagueId } },
                { awayTeam: { leagueId: COMPETITIONS.premier_league.leagueId } },
            ]
        },
        orderBy: { kickoff: 'asc' },
        take: 6
    })

    const upcomingFixtures = upcomingFixturesRaw.map(fx => ({
        id: fx.id,
        homeTeamName: fx.homeTeamName,
        awayTeamName: fx.awayTeamName,
        homeTeamImage: fx.homeTeamImage,
        awayTeamImage: fx.awayTeamImage,
        kickoff: fx.kickoff.toISOString(),
        competition: fx.competition,
    }))

    // AFter fetching myTeam, get roster player IDs and count active sidelined entries
    const rosterPlayerIds = closestGameweekSnapshot?.players.map(p => p.playerId)
    const sidelinedCount = await prisma.sidelined.count({
        where: {
            playerId: { in: rosterPlayerIds },
            completed: false
        }
    })

    return (
        <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Column 1 - Row 1, Hero Tile + Waivers + Sidelined */}
                <div className="grid grid-cols-4 gap-4" style={{ gridColumn: 1, gridRow: 1 }}>
                    <div className="col-span-2">
                        <ClubSummaryTile team={myTeam} rank={myRank} totalTeams={leagueTeams.length} />
                    </div>
                    <WaiverClaimsTile 
                        claimCount={pendingClaimsCount}
                        closesAt={waiverWindow?.closesAt.toISOString() ?? 'Waiver Window Issue'}
                    />
                    <SidelinedTile sidelinedCount={sidelinedCount} />
                </div>

                {/* Column 1 Row 2 - Current Matchup */}
                <div style={{ gridColumn: 1, gridRow: 2 }}>
                    <CurrentCompetitionTile matchup={currentMatchup} currentTeamId={myTeam.id} cupSlides={cupSlides} />
                </div>

                {/* Column 1 Row 3 - Latest Lineup */}
                <div style={{ gridColumn: 1, gridRow: 3 }}>
                    <LatestLineupTile 
                        formation={closestGameweekSnapshot?.formation ?? myTeam.formation}
                        players={lineupPlayers}
                        gameweekNumber={closestGameweek?.gameweekNumber ?? null }
                    />
                </div>

                {/* Column 2 - Row 1 : Matches row 1 and 2 of the other side */}
                <div className="grid grid-cols-2 gap-4" style={{ gridColumn: 2, gridRow: '1 / 3' }}>
                    <NextFixturesTile fixtures={upcomingFixtures} />
                    <LeagueActivityTile activity={recentActivity} />
                </div>

                {/* Column 2, Row 2 (Row 3) - Competitions + News */}
                <div className="grid grid-cols-2 gap-4" style={{ gridColumn: 2, gridRow: 3 }}>
                    <div className="bg-white border border-gray-100 rounded-xl p-4 h-64 flex items-center justify-center">
                        <p className="text-xs text-gray-400">Competitions - Coming Soon</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl h-64 flex items-center justify-center">
                        <p className="text-xs text-gray-400">News - Coming Soon</p>
                    </div>
                </div>
            </div>
        </div>
    )
}