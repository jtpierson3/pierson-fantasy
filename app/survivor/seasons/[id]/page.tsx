import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import SeasonDetail from './SeasonDetail' 

async function SeasonDetailContent({ id }: { id: string }) {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')
    
    const season = await prisma.survivorSeason.findUnique({
        where: { id },
        include: {
            contestants: {
            include: {
                survivorPlayer: true,
                tribeMemberships: {
                include: { tribe: true }
                },
                challengeResults: {
                where: { placement: 1 },
                include: { challenge: true }
                },
                votesReceived: {
                where: { isRevoked: false }
                },
                episodeStats: {
                include: { event: true, episode: true }
                }
            },
            orderBy: { placement: 'asc' }
            },
            episodes: {
            include: {
                challenges: {
                include: {
                    results: {
                    include: {
                        contestant: {
                        include: { survivorPlayer: true, tribeMemberships: { include: { tribe: true } } }
                        },
                        team: true,
                    },
                    orderBy: { placement: 'asc' }
                    },
                    teams: {
                    include: {
                        contestants: {
                        include: { survivorPlayer: true }
                        },
                        result: true,
                    }
                    }
                },
                orderBy: { order: 'asc' }
                },
                tribalCouncils: {
                include: {
                    votes: {
                    include: {
                        voter: { include: { survivorPlayer: true } },
                        votedFor: { include: { survivorPlayer: true } },
                    }
                    },
                    eliminated: {
                    include: {
                        survivorPlayer: true,
                        tribeMemberships: {
                        include: { tribe: true }
                        }
                    }
                    },
                },
                orderBy: { order: 'asc' }
                },
                stats: {
                include: {
                    contestant: {
                    include: {
                        survivorPlayer: true,
                        tribeMemberships: {
                        include: { tribe: true }
                        }
                    }
                    },
                    event: true,
                }
                }
            },
            orderBy: { number: 'asc' }
            },
            tribes: {
            orderBy: { name: 'asc' }
            },
            scoringEvents: true,
        }
        })

    if (!season) notFound()

    return <SeasonDetail season={season} />
}

export default async function SeasonDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    return(
        <Suspense fallback={
            <div className="p-6 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <SeasonDetailContent id={id} />
        </Suspense>
    )
}