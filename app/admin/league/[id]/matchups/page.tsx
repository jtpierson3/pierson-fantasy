import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import MatchupManager from './MatchupManager'

export default async function MatchupsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: leagueId } = await params
  const { userId } = await auth()
  if (!userId) notFound()

  const currentUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { leagues: true }
  })
  if (!currentUser) notFound()

  const isLeagueAdmin = currentUser.leagues.some(
    m => m.fantasyLeagueId === leagueId && m.isAdmin
  )
  if (!currentUser.isSiteAdmin && !isLeagueAdmin) notFound()

  const league = await prisma.fantasyLeague.findUnique({
    where: { id: leagueId },
    include: {
      gameweeks: {
        include: {
          matchups: {
            include: {
              homeTeam: { include: { user: true } },
              awayTeam: { include: { user: true } },
            }
          }
        },
        orderBy: { gameweekNumber: 'asc' }
      }
    }
  })

  if (!league) notFound()

  return <MatchupManager league={league} />
}