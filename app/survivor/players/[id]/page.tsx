import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import PlayerWiki from './PlayerWiki'

async function PlayerWikiContent({ id }: { id: string }) {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const player = await prisma.survivorPlayer.findUnique({
        where: { id },
        include: { 
            contestants: {
                include: {
                    survivorSeason: true,
                    tribeMemberships: {
                        include: { tribe: true }
                    },
                    challengeResults: {
                        include: {
                            challenge: {
                                include: {
                                    episode: true,
                                    survivorChallenge: true
                                }
                            }
                        }
                    },
                    sitOuts: {
                        include: {
                            challenge: {
                                include: {
                                    episode: true,
                                }
                            }
                        }
                    },
                    votesReceived: {
                        where: { isRevoked: false },
                        include: {
                            voter: {
                                include: { survivorPlayer: true }
                            },
                            tribalCouncil: {
                                include: {
                                    episode: true
                                }
                            }
                        }
                    },
                    votesGiven: {
                        include: {
                            votedFor: {
                                include: { survivorPlayer: true }
                            },
                            tribalCouncil: {
                                include: {
                                    episode: true
                                }
                            }
                        },    
                    },
                    episodeStats: {
                        include: {
                            event: true,
                            episode: true
                        },
                        orderBy: {order: 'asc'}
                    }
                },
                orderBy: {survivorSeason: { number: 'desc' } }
            }
        }
    })

    if (!player) notFound()

    return <PlayerWiki player={player} />
}

export default async function PlayerWikiPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    return (
        <Suspense fallback={
            <div className="p-6 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <PlayerWikiContent id={id} />
        </Suspense>
    )
}