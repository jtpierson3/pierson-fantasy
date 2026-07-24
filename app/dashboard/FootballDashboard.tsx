import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getLeagueStandings } from '@/lib/leagueStandings'
import ClubSummaryTile from './tiles/ClubSummaryTile'

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

    return (
        <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ClubSummaryTile team={myTeam} rank={myRank} totalTeams={leagueTeams.length} />
                {/* Future Tiles go here */}
            </div>
        </div>
    )
}