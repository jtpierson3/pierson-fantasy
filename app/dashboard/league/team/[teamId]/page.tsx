import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import ViewTeamLineup from './ViewTeamLineup'

function ViewTeamSkeleton() {
    return (
        <div className="p-6">
            <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-6" />
            <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
        </div>
    )
}

async function ViewTeamContent({ teamId }: { teamId: string }) {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) redirect('/sign-in')

    const team = await prisma.fantasyTeam.findUnique({
        where: { id: teamId },
        include: {
            user: true,
            fantasyLeague: true,
            players: {
                include: {
                    player: { include: { team: true } }
                },
                orderBy: { slotOrder: 'asc' }
            }
        }
    })

    if (!team) notFound()

    // Confirm the viewer is a member of the same league
    const isMember = await prisma.fantasyLeagueMember.findFirst({
        where: { userId: user.id, fantasyLeagueId: team.fantasyLeagueId }
    })
    if (!isMember) notFound()

    return <ViewTeamLineup team={team} isOwnTeam={team.userId === user.id} />
}

export default async function ViewTeamPage({
    params,
} : {
    params: Promise<{ teamId: string }>
}) {
    const { teamId } = await params
    return (
        <Suspense fallback={<ViewTeamSkeleton />}>
            <ViewTeamContent teamId={teamId} />
        </Suspense>
    )
}