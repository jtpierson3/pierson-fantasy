import { Suspense } from "react";
import { prisma } from '@/lib/prisma'
import PlayerList from './playerList'

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
  const [players, teams] = await Promise.all([
    prisma.player.findMany({
      include: { team: true },
      orderBy: [
        { position_id: 'asc' },
        { display_name: 'asc' },
      ],
    }),
    prisma.team.findMany({
      orderBy: { name: 'asc' },
    }),
  ])

  return <PlayerList players={players} teams={teams} />
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<PlayersSkeleton />}>
      <PlayersContent />
    </Suspense>
  )
}