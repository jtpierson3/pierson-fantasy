import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import FixtureList from './fixtureList'

function FixturesSkeleton() {
  return (
    <div className="p-6">
      <div className="h-6 w-32 bg-gray-100 rounded animate-pulse mb-6" />
      <div className="flex gap-2 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 w-32 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}

async function FixturesContent() {
  const fixtures = await prisma.fixture.findMany({
    include: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: { kickoff: 'asc' }
  })

  return <FixtureList fixtures={fixtures} />
}

export default function FixturesPage() {
  return (
    <Suspense fallback={<FixturesSkeleton />}>
      <FixturesContent />
    </Suspense>
  )
}