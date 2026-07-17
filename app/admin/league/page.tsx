import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import LeagueSettings from './leagueSettings'

export default async function LeagueSettingsPage() {
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

    //Get all leagues this user admins
    const adminLeagues = await prisma.fantasyLeague.findMany({
        where: {
            members: {
                some: {
                    userId: currentUser.id,
                    isAdmin: true,
                }
            }
        },
        include: {
            members: {
                include: {
                    user: true,
                }
            },
            teams: {
                include: { user: true }
            },
        },
        orderBy: { createdAt: 'desc'}
    })

    // Site admins see all leagues
    const allLeagues = currentUser.isSiteAdmin
        ? await prisma.fantasyLeague.findMany({
            include: {
                members:{
                    include: { user: true }
                },
                teams: {
                    include: { user: true }
                },
            },
            orderBy: { createdAt: 'desc'}
        }) : []

    //All site users for adding to league
    const allUsers = currentUser.isSiteAdmin
        ? await prisma.user.findMany({
            orderBy: { username: 'asc' }
        })
        : await prisma.user.findMany({
            orderBy: { username: 'asc'}
        })

    return (
        <LeagueSettings 
            adminLeagues={adminLeagues}
            allLeagues={allLeagues}
            allUsers={allUsers}
            currentUserId={currentUser.id}
            isSiteAdmin={currentUser.isSiteAdmin}
        />    
    )
}