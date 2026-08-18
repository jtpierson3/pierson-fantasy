import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import SidelinedView from './SidelinedView'
import { COMPETITIONS } from '@/lib/sportmonksConstants'

function SidelinedSkeleton() {
  return (
    <div className="p-6">
      <div className="h-6 w-32 bg-gray-100 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-2 gap-6">
        <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}

async function SidelinedContent() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/sign-in')

  const myTeam = await prisma.fantasyTeam.findFirst({
    where: { userId: user.id },
    include: { players: { select: { playerId: true } } }
  })

  const myPlayerIds = myTeam?.players.map(p => p.playerId) ?? []

  const mySidelined = await prisma.sidelined.findMany({
    where: { playerId: { in: myPlayerIds }, completed: false },
    include: { player: { include: { team: true } } },
    orderBy: { startDate: 'desc' }
  })

  // All 20 tracked PL teams, with their currently sidelined players
  const allTeams = await prisma.team.findMany({
    where: { leagueId: COMPETITIONS.premier_league.leagueId },
    orderBy: { name: 'asc' }
  })

  const allSidelined = await prisma.sidelined.findMany({
    where: {
      completed: false,
      player: { teamId: { in: allTeams.map(t => t.id) } }
    },
    include: { player: true },
    orderBy: { startDate: 'desc' }
  })

  const sidelinedByTeam = allTeams.map(team => ({
    team: { id: team.id, name: team.name, image_path: team.image_path },
    players: allSidelined
      .filter(s => s.player.teamId === team.id)
      .map(s => ({
        id: s.id,
        playerId: s.playerId,
        playerName: s.player.display_name,
        playerImage: s.player.image_path,
        category: s.category,
        typeName: s.typeName,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate?.toISOString() ?? null,
        gamesMissed: s.gamesMissed,
      }))
  }))

  return (
    <SidelinedView
      mySidelined={mySidelined.map(s => ({
        id: s.id,
        playerId: s.playerId,
        playerName: s.player.display_name,
        playerImage: s.player.image_path,
        teamName: s.player.team?.name ?? null,
        category: s.category,
        typeName: s.typeName,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate?.toISOString() ?? null,
        gamesMissed: s.gamesMissed,
      }))}
      sidelinedByTeam={sidelinedByTeam}
    />
  )
}

export default function SidelinedPage() {
  return (
    <Suspense fallback={<SidelinedSkeleton />}>
      <SidelinedContent />
    </Suspense>
  )
}