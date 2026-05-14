import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import LeagueDashboard from './leagueDashboard'

function LeagueSkeleton() {
    return (
        <div className="p-6">
            <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-6" />
            <div className="flex gap-6">
                <div className="w-1/3 h-96 bg-gray-100 rounded-xl animate-pulse" />
                <div className="flex-1 flex flex-col gap-4">
                    <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                </div>
            </div>
        </div>
    )
}

async function LeagueContent({ leagueId }: { leagueId: string}) {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const user = await prisma.user.findUnique({
        where: { clerkId: userId }
    })
    if (!user) redirect('/sign-in')

    const league = await prisma.survivorLeague.findUnique({
        where: { id: leagueId },
        include: {
            survivorSeason: {
                include: {
                    episodes: {
                        orderBy: { number: 'desc' }
                    }
                }
            },
            members: {
                include: { user: true }
            },
            tribes: {
                include: {
                    user: true,
                    players: {
                        include: {
                            contestant: {
                                include: {
                                    survivorPlayer: true,
                                    episodeStats: {
                                        include: {
                                            event: true,
                                            episode: true,
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    if (!league) notFound()

    //check user is a member
    const isMember = league.members.some(m => m.user.id === user.id)
    if (!isMember) notFound()

    // Get past leagues for this user in other seasons
    const pastLeagues = await prisma.survivorLeague.findMany({
        where: {
            id: { not: leagueId},
            members: { some: { userId: user.id } }
        },
        include: {
            survivorSeason: true,
            tribes: { 
                where: { userId: user.id }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <LeagueDashboard 
            league={league as any}
            userId={user.id}
            pastLeagues={pastLeagues as any}
        />
    )
}

export default async function SurvivorLeaguePage({
    params,
} : {
    params: Promise<{ leagueId: string}>
}) {
    const { leagueId } = await params
    return (
        <Suspense fallback={<LeagueSkeleton />}>
            <LeagueContent leagueId={leagueId} />
        </Suspense>
    )
}