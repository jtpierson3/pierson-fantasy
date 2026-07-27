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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ClubSummaryTile team={myTeam} rank={myRank} totalTeams={leagueTeams.length} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <CurrentMatchupTile matchup={currentMatchup} currentTeamId={myTeam.id} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <LatestLineupTile 
                    formation={closestGameweekSnapshot?.formation ?? myTeam.formation}
                    players={lineupPlayers}
                    gameweekNumber={closestGameweek?.gameweekNumber ?? null}
                />
            </div>
        </div>
    )
}