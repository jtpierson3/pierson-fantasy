import { Suspense } from "react"
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from "next/navigation"
import LeagueDashboard from "./leagueDashboard"
import { LeagueWithData } from "./types"

function LeagueSkeleton() {
  return (
    <div className="p-6">
      <div className="h-6 w-32 bg-gray-100 rounded animate-pulse mb-6" />
      <div className="flex gap-6">
        <div className="w-1/3 h-96 bg-gray-100 rounded-xl animate-pulse" />
        <div className="flex-1 flex flex-col gap-4">
          <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}

async function LeagueContent() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })
  if (!user) redirect('/sign-in')

  const fantasyTeam = await prisma.fantasyTeam.findFirst({
    where: { userId: user.id }
  })
  if (!fantasyTeam) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-medium text-gray-900 mb-2">League</h1>
        <p className="text-sm text-gray-500">
          You do not have a team yet. Please notify the league admin.
        </p>
      </div>
    )
  }

  const league = await prisma.fantasyLeague.findUnique({
    where: {id: fantasyTeam.fantasyLeagueId },
    include: {
      teams: {
        include: {
          user: true,
          homeMatchups: true,
          awayMatchups: true,
        },
        orderBy: [
          { totalLeaguePoints: 'desc' },
          { totalFantasyPoints: 'desc' },
        ]
      },
      gameweeks: {
        include: {
          matchups: {
            include: {
              homeTeam: {
                include: {
                  user: true,
                  homeMatchups: true,
                  awayMatchups: true,
                }
              },
              awayTeam: {
                include: {
                  user: true,
                  homeMatchups: true,
                  awayMatchups: true,
                }
              },
              gameweek: true,
            }
          }
        },
        orderBy: {gameweekNumber: 'asc'}
      }
    }
  })

  if (!league) {
    return(
      <div className="p-6">
        <p className="text-sm text-red-500">
          League not found.
        </p>
      </div>
    )
  }

  return (
    <LeagueDashboard 
      league={league as unknown as LeagueWithData}
      currentTeamId={fantasyTeam.id}
    />
  )
}

export default function LeaguePage() {
  return (
    <Suspense fallback={<LeagueSkeleton />}>
      <LeagueContent />
    </Suspense>
  )
}