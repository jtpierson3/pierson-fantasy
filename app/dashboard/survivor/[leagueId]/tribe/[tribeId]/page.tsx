import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import ViewTribe from './ViewTribe'

async function ViewTribeContent({
  leagueId,
  tribeId,
}: {
  leagueId: string
  tribeId: string
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })
  if (!user) redirect('/sign-in')

  const league = await prisma.survivorLeague.findUnique({
    where: { id: leagueId },
    include: {
      survivorSeason: true,
      members: true,
    }
  })

  if (!league) notFound()

  const isMember = league.members.some(m => m.userId === user.id)
  if (!isMember) notFound()

  const tribe = await prisma.survivorFantasyLeagueTribe.findFirst({
    where: { id: tribeId, survivorLeagueId: leagueId },
    include: {
      user: true,
      players: {
        include: {
          contestant: {
            include: {
              survivorPlayer: true,
              tribeMemberships: {
                where: { isCurrent: true },
                include: { tribe: true }
              },
              episodeStats: {
                include: { event: true, episode: true }
              }
            }
          },
          swappedFrom: {
            include: {
                survivorPlayer: true,
                tribeMemberships: {
                    include: {
                        tribe: true
                    }
                },
                episodeStats: {
                    include: { event: true, episode: true}
                }
            }
        }
        }
      }
    }
  })

  if (!tribe) notFound()

  const airedEpisodeIds = new Set(
    (await prisma.episode.findMany({
      where: {
        survivorSeasonId: league.survivorSeason.id,
        isAired: true
      },
      select: { id: true }
    })).map(e => e.id)
  )

  const eliminationPicks = await prisma.eliminationPick.findMany({
    where: {
      userId: tribe.userId,
      survivorLeagueId: leagueId
    },
    include: {
      contestant: {
        include: { survivorPlayer: true }
      },
      episode: true
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

  const episodes = await prisma.episode.findMany({
    where: { survivorSeasonId: league.survivorSeason.id },
    orderBy: { number: 'asc' }
  })

  const mergeEpisode = await prisma.episode.findFirst({
    where: {
      survivorSeasonId: league.survivorSeason.id,
      isMerge: true,
      isAired: true
    }
  })

  return (
    <ViewTribe
      leagueId={leagueId}
      tribe={tribe}
      season={league.survivorSeason}
      airedEpisodeIds={airedEpisodeIds}
      isMyTribe={tribe.userId === user.id}
      mergeEpisode={mergeEpisode}
      eliminationPicks={eliminationPicks}
      eliminationPickPoints={eliminationPickEvent?.points ?? 0}
      winnerPickPoints={winnerPickEvent?.points ?? 0}
      episodes={episodes}
    />
  )
}

export default async function ViewTribePage({
  params,
}: {
  params: Promise<{ leagueId: string; tribeId: string }>
}) {
  const { leagueId, tribeId } = await params
  return (
    <Suspense fallback={
      <div className="p-6 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ViewTribeContent leagueId={leagueId} tribeId={tribeId} />
    </Suspense>
  )
}