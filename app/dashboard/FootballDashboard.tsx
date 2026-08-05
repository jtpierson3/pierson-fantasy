import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getLeagueStandings } from '@/lib/leagueStandings'
import { selectClosestGameweek } from '@/lib/gameweekSelection'
import ClubSummaryTile from '@/app/components/tiles/ClubSummaryTile'
import CurrentMatchupTile from '@/app/components/tiles/CurrentMatchupTile'
import LatestLineupTile from '@/app/components/tiles/LatestLineupTile'
import { getCurrentWaiverWindow } from '@/lib/fixtureTiming'
import WaiverClaimsTile from '@/app/components/tiles/WaiverClaimsTile'
import LeagueActivityTile from '@/app/components/tiles/LeagueActivityTile'
import NextFixturesTile from '@/app/components/tiles/NextFixturesTile'
import { COMPETITIONS } from '@/lib/sportmonksConstants'

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
        select: { id: true, gameweekNumber: true, startDate: true, endDate: true },
        orderBy: { gameweekNumber: 'asc' }
    })

    const closestGameweek = selectClosestGameweek(allGameweeks, new Date())

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

    const recentActivityRaw = await prisma.waiverClaim.findMany({
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
        take: 20, //fetch a generous batch, the tile will only render what fits.
    })

    const recentActivity = recentActivityRaw.map(claim => ({
        id: claim.id,
        teamName: claim.fantasyTeam.name,
        playerAddedName: claim.playerToAdd.display_name,
        playerDroppedName: claim.playerToDrop?.display_name ?? null,
        processedAt: claim.processedAt?.toISOString() ?? claim.submittedAt.toISOString()
    }))

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
                        closesAt={waiverWindow?.closesAt.toISOString() ?? null}
                    />
                    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-center">
                        <p className="text-xs text-gray-400">Sidelined - coming soon</p>
                    </div>
                </div>

                {/* Column 1 Row 2 - Current Matchup */}
                <div style={{ gridColumn: 1, gridRow: 2 }}>
                    <CurrentMatchupTile matchup={currentMatchup} currentTeamId={myTeam.id} />
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