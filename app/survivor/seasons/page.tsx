import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import SeasonBrowser from './SeasonBrowser'

function SeasonBrowserSkeleton() {
  return (
    <div className="p-6">
      <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}

async function SeasonBrowserContent() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const seasons = await prisma.survivorSeason.findMany({
    include: {
      contestants: { select: { id: true } },
      episodes: { select: { id: true } },
      tribes: { select: { id: true, name: true, color: true } },
    },
    orderBy: { number: 'desc' }
  })

  return <SeasonBrowser seasons={seasons} />
}

export default function SeasonBrowserPage() {
  return (
    <Suspense fallback={<SeasonBrowserSkeleton />}>
      <SeasonBrowserContent />
    </Suspense>
  )
}