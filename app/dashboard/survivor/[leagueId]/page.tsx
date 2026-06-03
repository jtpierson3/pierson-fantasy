import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import type { Prisma } from '@prisma/client'
import LeagueDashboard from './leagueDashboard'

type LeagueWithDetails = Prisma.SurvivorLeagueGetPayload<{
    include: {
        survivorSeason: {
            include: { episodes: true }
        }
        members :{ include: { user: true } }
        tribes: {
            include: {
                user: true
                players: {
                    include: {
                        contestant: {
                            include: {
                                survivorPlayer: true
                                episodeStats: {
                                    include: {
                                        event: true
                                        episode: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}>

type PastLeagueWithDetails = Prisma.SurvivorLeagueGetPayload<{
    include: {
        survivorSeason: {
            include: { episodes: true }
        }
        tribes: {
            include: {
                user: true
                players: {
                    include: {
                        contestant: {
                            include: {
                                survivorPlayer: true
                                episodeStats: {
                                    include: {
                                        event: true
                                        episode: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}>

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

    const nextEpisode = league.survivorSeason.episodes
        .filter(e => !e.isAired)
        .sort((a, b) => a.number - b.number)[0] ?? null

    // Get past leagues for this user in other seasons
    const activeContestants = await prisma.contestant.findMany({
        where: {
            survivorSeasonId: league.survivorSeason.id,
            status: { in: ['active', 'finalist']}
        },
        include: {
            survivorPlayer: true,
            tribeMemberships: {
                include: { tribe: true },
                orderBy: { id: 'asc' }
            }
        },
        orderBy: { survivorPlayer: { name: 'asc' } }
    })

    const currentPick = nextEpisode
        ? await prisma.eliminationPick.findUnique({
            where: {
                userId_survivorLeagueId_episodeId: {
                    userId: user.id,
                    survivorLeagueId: leagueId,
                    episodeId: nextEpisode.id
                }
            },
            include: {
                contestant: {
                    include: {
                        survivorPlayer: true,
                        tribeMemberships: {
                            include: { tribe: true },
                            orderBy: { id: 'asc' }
                        }
                    }
                }
            }
        })
        : null

    const pastLeagues = await prisma.survivorLeague.findMany({
        where: {
            id: { not: leagueId },
            members: { some: { userId: user.id } }
        },
        include: {
            survivorSeason: true,
            tribes: { where: { userId: user.id } }
        },
        orderBy: { createdAt: 'desc' }
    })

    const lastEpisode = league.survivorSeason.episodes
        .filter(e => e.isAired)
        .sort((a,b) => b.number - a.number)[0] ?? null

    const lastEpisodePick = lastEpisode
        ? await prisma.eliminationPick.findUnique({
                where: {
                    userId_survivorLeagueId_episodeId: {
                        userId: user.id,
                        survivorLeagueId: leagueId,
                        episodeId: lastEpisode.id
                    }
                },
                include: {
                    contestant: {
                        include: { survivorPlayer: true}
                    }
                }
            })
        : null

    const eliminationPicks = await prisma.eliminationPick.findMany({
        where: {
            userId: user.id
        }
    })

    const eliminationPickEvent = await prisma.scoringEvent.findFirst({
        where: {
            survivorSeasonId: league.survivorSeason.id,
            label: 'Correct Elimination Pick'
        }
    })

    const winnerPickEvent = await prisma.scoringEvent.findFirst({
        where: {
            survivorSeasonId: league.survivorSeason.id,
            label: 'Correct Winner Pick'
        }
    })

    const seasonContestants = await prisma.contestant.findMany({
        where: { survivorSeasonId: league.survivorSeason.id },
        include: {
            survivorPlayer: true,
            episodeStats: {
                include: { event: true, episode: true }
            }
        }
    })

    return (
        <LeagueDashboard 
            league={league as LeagueWithDetails}
            userId={user.id}
            seasonContestants={seasonContestants}
            activeContestants={activeContestants}
            currentPick={currentPick}
            lastEpisodePick={lastEpisodePick}
            eliminationPicks={eliminationPicks}
            eliminationPickPoints={eliminationPickEvent?.points ?? 0}
            winnerPickPoints={winnerPickEvent?.points ?? 0}
            leagueId={leagueId}
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