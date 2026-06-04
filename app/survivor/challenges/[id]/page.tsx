import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import ChallengeWiki from './ChallengeWiki'

async function ChallengeWikiContent({ id }: { id: string }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const challenge = await prisma.survivorChallenge.findUnique({
    where: { id },
    include: {
      challenges: {
        include: {
          episode: {
            include: {
              survivorSeason: true
            }
          },
          results: {
            include: {
              contestant: {
                include: {
                  survivorPlayer: true,
                  tribeMemberships: {
                    include: { tribe: true },
                    orderBy: { id: 'asc' }
                  }
                }
              },
              team: {
                include: {
                  contestants: {
                    include: { survivorPlayer: true }
                  }
                }
              }
            },
            orderBy: { placement: 'asc' }
          },
          teams: {
            include: {
              contestants: {
                include: { survivorPlayer: true }
              },
              result: true
            }
          },
          sitOuts: {
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
          },
          survivorChallenge: {}
        },
        orderBy: { episode: { survivorSeason: { number: 'asc' } } }
      }
    }
  })

  if (!challenge) notFound()

  return <ChallengeWiki challenge={challenge} />
}

export default async function ChallengeWikiPage({
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
      <ChallengeWikiContent id={id} />
    </Suspense>
  )
}