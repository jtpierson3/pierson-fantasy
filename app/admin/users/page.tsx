import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import UsersTable from './usersTable'

export default async function UsersPage() {
    const { userId } = await auth()
    if (!userId) notFound()

    const currentUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
            leagues: {
                include: { fantasyLeague: true }
            }
        }
    })

    if (!currentUser) notFound()

    const isLeagueAdmin = currentUser.leagues.some(m => m.isAdmin)
    if (!currentUser.isSiteAdmin && !isLeagueAdmin) notFound()

    // Get League Admin's league
    const adminLeague = currentUser.leagues.find(m => m.isAdmin)?.fantasyLeague

    // Fetch users in the league
    const leagueMembers = adminLeague ? await prisma.fantasyLeagueMember.findMany({
        where: { fantasyLeagueId: adminLeague.id},
        include: {
            user: {
                include: {
                    fantasyTeams: {
                        where: { fantasyLeagueId: adminLeague.id}
                    }
                }
            }
        },
        orderBy: { user: { username: 'asc'} }
    }) : []

    // Site admins can also see all users
    const allUsers = currentUser.isSiteAdmin
        ? await prisma.user.findMany({
            include: {
                leagues: {
                    include: { fantasyLeague: true }
                },
                fantasyTeams: true,
            },
            orderBy: { createdAt: 'desc' }
        })
    : []

    return (
        <UsersTable
            leagueMembers={leagueMembers}
            allUsers={allUsers}
            currentUserId={currentUser.id}
            isSiteAdmin={currentUser.isSiteAdmin}
            leagueName={adminLeague?.name ?? ''}
            leagueId={adminLeague?.id ?? ''}
        />
    )
}