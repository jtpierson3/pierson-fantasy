import { Suspense } from "react";
import { prisma } from '@/lib/prisma'
import PlayerList from './playerList'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

function PlayersSkeleton() {
  return(
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 w-24 bg-gray-100 rounded animate-pulse"/>
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse"/>
      </div>
      <div className="flex gap-2 mb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 animate-pulse">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-3" />
            <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

async function PlayersContent() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })
  if (!user) redirect('/sign-in')

  // Only what the page needs from the user's own team
  const myFantasyTeam = await prisma.fantasyTeam.findFirst({
    where: { userId: user.id },
    select: {
      id: true,
      fantasyLeagueId: true,
      fantasyLeague: { select: { draftComplete: true } },
      players: {
        select: {
          id: true,
          playerId: true,
          rosterSlot: true,
          player: { select: { display_name: true } },
        },
      },
    },
  })

  // Everything below depends only on myFantasyTeam, so it all runs at once
  const [scoreAgg, rosteredRows, myPendingClaims, players, teams] = await Promise.all([
    prisma.playerFixturePoints.groupBy({
      by: ['playerId'],
      _sum: { points: true },
      _count: { _all: true },
    }),
    // Rostered players in the same league - just who owns them, never the user rows themselves.
    myFantasyTeam
      ? prisma.fantasyTeamPlayer.findMany({
          where: { fantasyTeam: { fantasyLeagueId: myFantasyTeam. fantasyLeagueId } },
          select: {
            playerId: true,
            fantasyTeam: { select: { user: { select: { username: true } } } },
          },
        })
      : Promise.resolve([]),
    // This team's pending wavier claims, so we know which players are already claimed.
    myFantasyTeam
        ? prisma.waiverClaim.findMany({
            where: { fantasyTeamId: myFantasyTeam.id, status: 'pending' },
            select: { playerToAddId: true },
          })
        : Promise.resolve([]),
    prisma.player.findMany({
      select: {
        id: true,
        display_name: true,
        image_path: true,
        position_id: true,
        jersey_number: true,
        teamId: true,
        currentClubName: true,
        team: { select: { name: true, image_path: true, leagueId: true } },
      },
      orderBy: [
        { position_id: 'asc' },
        { display_name: 'asc' },
      ]
    }),
    prisma.team.findMany({
      select: { id: true, name: true, leagueId: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const scores: Record<number, { total: number; games: number }> = {}
  for (const row of scoreAgg) {
    scores[row.playerId] = { total: row._sum.points ?? 0, games: row._count._all }
  }

  const ownerByPlayerId: Record<number, string> = {}
  for (const row of rosteredRows) {
    ownerByPlayerId[row.playerId] = row.fantasyTeam.user?.username ?? 'Unknown'
  }

  const myPendingClaimPlayerIds = myPendingClaims.map(c => c.playerToAddId)

  return (
    <PlayerList
      players={players}
      teams={teams}
      myFantasyTeam={myFantasyTeam ? { id: myFantasyTeam.id, players: myFantasyTeam.players } : null}
      ownerByPlayerId={ownerByPlayerId}
      draftComplete={myFantasyTeam?.fantasyLeague.draftComplete ?? false}
      myPendingClaimPlayerIds={myPendingClaimPlayerIds}
      scores={scores}
    />
  )
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<PlayersSkeleton />}>
      <PlayersContent />
    </Suspense>
  )
}