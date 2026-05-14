import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import SeasonDetail from './seasonDetail'
import type { Prisma } from '@prisma/client'

type SeasonWithDetails = Prisma.SurvivorSeasonGetPayload<{
  include: {
    contestants: {
      include: {
        survivorPlayer: true
        tribeMemberships: {
          include: { tribe: true }
        }
      }
    }
    tribes: true
    episodes: true
    scoringEvents: true
  }
}>

export default async function SeasonDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const { userId } = await auth()
    if (!userId) notFound()

    const currentUser = await prisma.user.findUnique({
        where: { clerkId: userId }
    })
    if (!currentUser?.isSiteAdmin) notFound()

    const season = await prisma.survivorSeason.findUnique({
        where: { id: id },
        include: {
            contestants: {
                include: {
                    survivorPlayer: true,
                    tribeMemberships: {
                        include: { tribe: true }
                    }
                },
                orderBy: { placement: 'asc' }
            },
            tribes: {
                orderBy: { name: 'asc' }
            },
            episodes: {
                orderBy: { number: 'asc'}
            },
            scoringEvents: {
                orderBy: { category: 'asc' }
            }
        }
    })

    if (!season) notFound()

    const allPlayers = await prisma.survivorPlayer.findMany({
        orderBy: { name: 'asc' }
    })

    return <SeasonDetail season={season as SeasonWithDetails} allPlayers={allPlayers} />
}