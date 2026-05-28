import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import EpisodeDetail from './episodeDetail'
import type { Prisma } from '@prisma/client'

type EpisodeWithDetails = Prisma.EpisodeGetPayload<{
  include: {
    survivorSeason: { include: { tribes: true } }
    stats: {
      include: {
        contestant: { include: { survivorPlayer: true } }
        event: true
      }
    }
    challenges: {
      include: {
        sitOuts: {
          include: {
            contestant: {
              include: { survivorPlayer: true }
            }
          }
        }
        teams: {
          include: {
            contestants: { include: { survivorPlayer: true } }
            result: true
          }
        }
        results: {
          include: {
            contestant: { include: { survivorPlayer: true } }
          }
        }
      }
    }
    tribalCouncils: {
      include: {
        votes: {
          include: {
            voter: { include: { survivorPlayer: true } }
            votedFor: { include: { survivorPlayer: true } }
          }
        }
        eliminated: { include: { survivorPlayer: true } }
      }
    }
  }
}>

type ContestantWithDetails = Prisma.ContestantGetPayload<{
  include: {
    survivorPlayer: true
    tribeMemberships: { include: { tribe: true } }
  }
}>

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string; episodeId: string }>
}) {
  const { userId } = await auth()
  if (!userId) notFound()

  const currentUser = await prisma.user.findUnique({
    where: { clerkId: userId }
  })
  if (!currentUser?.isSiteAdmin) notFound()

  const { episodeId } = await params

  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: {
      survivorSeason: {
        include: {
            tribes: true
        }
      },
      stats: {
        include: {
          contestant: {
            include: { survivorPlayer: true }
          },
          event: true,
        },
        orderBy: { order: 'asc' }
      },
      challenges: {
        include: {
          teams: {
            include: {
              contestants: {
                include: { survivorPlayer: true }
              },
              result: true,
            }
          },
          results: {
            include: {
              contestant: {
                include: { survivorPlayer: true }
              },
              team: true,
            },
            orderBy: { placement: 'asc' }
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
            include: { survivorPlayer: true }
          },
        },
        orderBy: { order: 'asc' }
      }
    }
  })

  if (!episode) notFound()

  // Get all contestants for this season
  const contestants = await prisma.contestant.findMany({
    where: { survivorSeasonId: episode.survivorSeasonId },
    include: {
      survivorPlayer: true,
      tribeMemberships: {
        where: { isCurrent: true },
        include: { tribe: true }
      }
    },
    orderBy: { survivorPlayer: { name: 'asc' } }
  })

  // Get all scoring events for this season
  const scoringEvents = await prisma.scoringEvent.findMany({
    where: { survivorSeasonId: episode.survivorSeasonId },
    orderBy: [{ category: 'asc' }, { label: 'asc' }]
  })

  return (
    <EpisodeDetail
      episode={episode as EpisodeWithDetails}
      contestants={contestants as ContestantWithDetails[]}
      scoringEvents={scoringEvents}
    />
  )
}