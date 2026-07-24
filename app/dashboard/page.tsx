import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import FootballDashboard from './FootballDashboard'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      fantasyTeams: true,
      survivorLeagues: true
    }
  })

  if (!user) redirect('/sign-in')

  const hasFootball = user.fantasyTeams.length > 0
  const hasSurvivor = user.survivorLeagues.length > 0

  //Football takes priority when both exist
  if (hasFootball) {
    return <FootballDashboard />
  }

  if (hasSurvivor) {
    redirect('/dashboard/survivor')
  }

  // Neither - fallback to a simple message
  return (
    <div className="p-6">
      <h1 className="text-xl font-medium text-gray-900 mb-2">Welcome</h1>
      <p className="text-sm text-gray-500">
        You do not have any leagues yet. Talk to an admin to get set up.
      </p>
    </div>
  )
}