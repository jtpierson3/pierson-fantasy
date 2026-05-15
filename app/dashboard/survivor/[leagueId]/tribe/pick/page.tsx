import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import PickTribe from './PickTribe'

async function PickTribeContent({ leagueId }: { leagueId: string }) {
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
            orderBy: { number: 'asc' },
            take: 1,
          },
          tribes: true,
        }
      },
      members: true,
    }
  })

  if (!league) notFound()

  const isMember = league.members.some(m => m.userId === user.id)
  if (!isMember) notFound()

  const firstEpisode = league.survivorSeason.episodes[0]
  const isLocked = firstEpisode?.isAired ?? false

  // Get contestants for this season
  const contestants = await prisma.contestant.findMany({
    where: { survivorSeasonId: league.survivorSeason.id },
    include: {
      survivorPlayer: true,
      survivorSeason: true,
      tribeMemberships: {
        where: { isCurrent: true },
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
        include: { event: true }
      }
    },
    orderBy: { survivorPlayer: { name: 'asc' } }
  })

  // Get full career history for all players in this season
  const playerIds = contestants.map(c => c.survivorPlayerId)
  const allContestants = await prisma.contestant.findMany({
    where: { survivorPlayerId: { in: playerIds } },
    include: {
      survivorPlayer: true,
      survivorSeason: true,
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
        include: { event: true }
      }
    },
    orderBy: { survivorSeason: { number: 'desc' } }
  })

  const myTribe = await prisma.survivorFantasyLeagueTribe.findFirst({
    where: { userId: user.id, survivorLeagueId: leagueId },
    include: {
      players: {
        include: { contestant: true }
      }
    }
  })

  if (!myTribe) notFound()

  const currentPickIds = myTribe.players.map(p => p.contestantId)

  return (
    <PickTribe
      leagueId={leagueId}
      tribeId={myTribe.id}
      contestants={contestants}
      allContestants={allContestants}
      currentPickIds={currentPickIds}
      isLocked={isLocked}
      season={league.survivorSeason}
    />
  )
}

export default async function PickTribePage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  return (
    <Suspense fallback={
      <div className="p-6 h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PickTribeContent leagueId={leagueId} />
    </Suspense>
  )
}