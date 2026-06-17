import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import EpisodeWiki from './EpisodeWiki'

async function EpisodeWikiContent({
  seasonId,
  episodeId,
}: {
  seasonId: string
  episodeId: string
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: {
      survivorSeason: {
        include: {
          episodes: {
            orderBy: { number: 'asc' },
            select: { id: true, number: true, name: true, isAired: true }
          }
        }
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
        },
        orderBy: { order: 'asc' }
      },
      challenges: {
        include: {
          survivorChallenge: true,
          sitOuts: {
            include: {
              contestant: {
                include: { 
                  survivorPlayer: true,
                  tribeMemberships: {
                    include: { tribe: true },
                    orderBy: {id: 'asc'}
                  }
                }
              }
            }
          },
          results: {
            include: {
              contestant: {
                include: {
                  survivorPlayer: true,
                  tribeMemberships: {
                    include: { tribe: true }
                  }
                }
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
              voter: {
                include: {
                  survivorPlayer: true,
                  tribeMemberships: {
                    include: { tribe: true }
                  }
                }
              },
              votedFor: {
                include: {
                  survivorPlayer: true,
                  tribeMemberships: {
                    include: { tribe: true }
                  }
                }
              },
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
      }
    }
  })

  if (!episode) notFound()
  if (episode.survivorSeasonId !== seasonId) notFound()

  return <EpisodeWiki episode={episode} />
}

export default async function EpisodeWikiPage({
  params,
}: {
  params: Promise<{ id: string; episodeId: string }>
}) {
  const { id, episodeId } = await params
  return (
    <Suspense fallback={
      <div className="p-6 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <EpisodeWikiContent seasonId={id} episodeId={episodeId} />
    </Suspense>
  )
}