import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getLeagueStandings } from '@/lib/leagueStandings'
import { selectClosestGameweek } from '@/lib/gameweekSelection'
import ClubSummaryTile from '@/app/components/tiles/ClubSummaryTile'
import CurrentMatchupTile from '@/app/components/tiles/CurrentMatchupTile'
import LatestLineupTile from '@/app/components/tiles/LatestLineupTile'

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

    return (
        <div className="p-6">
            {/* Column 1 - Left Side */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Row 1 - Club Summary + Waiver Claims + Sidelined */}
                <div className="grid grid-cols-3 gap-4">
                    <ClubSummaryTile team={myTeam} rank={myRank} totalTeams={leagueTeams.length} />
                    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-center">
                        <p className="text-xs text-gray-400">Waiver Claims - coming soon</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-center">
                        <p className="text-xs text-gray-400">Sidelined - coming soon</p>
                    </div>
                </div>

                {/* Row 2 - Current Matchup */}
                <CurrentMatchupTile matchup={currentMatchup} currentTeamId={myTeam.id} />

                {/* Row 3 - Latest Lineup */}
                <LatestLineupTile 
                    formation={closestGameweekSnapshot?.formation ?? myTeam.formation}
                    players={lineupPlayers}
                    gameweekNumber={closestGameweek?.gameweekNumber ?? null }
                />
            </div>

            {/* Column 2 - Right */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Row 1 - Next Fixtures + League Activity */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-100 rounded-xl p-4 h-64 flex items-center justify-center">
                        <p className="text-xs text-gray-400">Next Fixtures - Coming Soon</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-4 h-64 flex items-center justify-center">
                        <p className="text-xs text-gray-400">League Activity - Coming Soon</p>
                    </div>
                </div>

                {/* Row 2 - Competitions + News */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-100 rounded-xl p-4 h-64 flex items-center justify-center">
                        <p className="text-xs text-gray-400">Competitions - Coming Soon</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-4 h-64 flex items-center justify-center">
                        <p className="text-xs text-gray-400">News - Coming Soon</p>
                    </div>
                </div>
            </div>
        </div>
    )
}