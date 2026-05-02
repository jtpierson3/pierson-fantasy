import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import MyTeam from './myTeam'
import { redirect } from 'next/navigation'

function MyTeamSkeleton() {
  return (
    <div className="p-6">
      <div className='h-6 w-32 bg-gray-100 rounded animate-pulse mb-6'/>
      <div className='flex gap-4 mb-6'>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-32 bg-gray-100 rounded animate-pulse mb-6"/>
        ))}
      </div>
      <div className="h-96 bg-gray-100 rounded-xl animate-pulse"/>
    </div>
  )
}

async function MyTeamContent() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: {clerkId: userId},
  })

  if (!user) redirect('/sign-in')

  const fantasyTeam = await prisma.fantasyTeam.findFirst({
    where: { userId: user.id},
    include: {
      players: {
        include: {
          player: {
            include: { team: true }
          }
        },
        orderBy: {slotOrder: 'asc'}
      },
      fantasyLeague: true
    }
  })

  if (!fantasyTeam) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-medium text-gray-900 mb-2">My Team</h1>
        <p className ="text-sm text-gray-500">
          You don't have a team yet. Talk to an admin to assign you a team.
        </p>
      </div>
    )
  }

  return <MyTeam fantasyTeam={fantasyTeam} />
}

export default function MyTeamPage() {
  return(
    <Suspense fallback={<MyTeamSkeleton />}>
      <MyTeamContent />
    </Suspense>
  )
}