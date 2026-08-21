import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import RealMatchView from './RealMatchView'

function MatchSkeleton() {
  return (
    <div className="p-6">
      <div className="h-20 bg-gray-100 rounded-xl animate-pulse mb-4" />
      <div className="h-[900px] bg-gray-100 rounded-xl animate-pulse" />
    </div>
  )
}

async function MatchContent({ fixtureId }: { fixtureId: number }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/sign-in')

  const fixture = await prisma.fixture.findUnique({
    where: { id: fixtureId },
    include: {
      homeTeam: true,
      awayTeam: true,
    }
  })
  if (!fixture) notFound()

  // Real lineups from PlayerMatchStats (only populated post-sync)
  const allStats = await prisma.playerMatchStats.findMany({
    where: { fixtureId },
    include: { player: { include: { team: true } } }
  })

  const allPoints = await prisma.playerFixturePoints.findMany({
    where: { fixtureId }
  })
  const pointsByPlayerId = new Map(allPoints.map(p => [p.playerId, { points: p.points, breakdown: p.breakdown }]))

  function buildTeamPlayers(teamId: number | null) {
    return allStats
      .filter(s => s.player.teamId === teamId)
      .map(s => ({
        id: s.id,
        playerId: s.playerId,
        wasStarter: s.wasStarter,
        positionPlayedId: s.positionPlayedId,
        points: pointsByPlayerId.get(s.playerId)?.points ?? 0,
        breakdown: pointsByPlayerId.get(s.playerId)?.breakdown ?? null,
        player: {
          id: s.player.id,
          display_name: s.player.display_name,
          image_path: s.player.image_path,
          position_id: s.player.position_id,
          detailed_position_id: s.player.detailed_position_id,
          team: s.player.team
            ? { name: s.player.team.name, image_path: s.player.team.image_path, leagueId: s.player.team.leagueId }
            : null,
        }
      }))
  }

  return (
    <RealMatchView
      fixture={{
        id: fixture.id,
        homeTeamName: fixture.homeTeamName,
        awayTeamName: fixture.awayTeamName,
        homeTeamImage: fixture.homeTeamImage,
        awayTeamImage: fixture.awayTeamImage,
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore,
        kickoff: fixture.kickoff.toISOString(),
        homeFormation: fixture.homeFormation,
        awayFormation: fixture.awayFormation,
        competition: fixture.competition,
      }}
      homePlayers={buildTeamPlayers(fixture.homeTeamId)}
      awayPlayers={buildTeamPlayers(fixture.awayTeamId)}
    />
  )
}

export default async function FixtureMatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<MatchSkeleton />}>
      <MatchContent fixtureId={parseInt(id)} />
    </Suspense>
  )
}