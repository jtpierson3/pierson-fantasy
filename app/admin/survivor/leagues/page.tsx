import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import SurvivorLeaguesManager from './survivorLeagueManager'
import type { Prisma } from '@prisma/client'

type LeagueWithDetails = Prisma.SurvivorLeagueGetPayload<{
  include: {
    survivorSeason: true
    members: { include: { user: true } }
    tribes: true
  }
}>

export default async function SurvivorLeaguesPage() {
    const { userId } = await auth()
    if (!userId) notFound()

    const currentUser = await prisma.user.findUnique({
        where: { clerkId: userId }
    })
    if (!currentUser?.isSiteAdmin) notFound()

    const leagues = await prisma.survivorLeague.findMany({
        include: {
            survivorSeason: true,
            members: {
                include: { user: true }
            },
            tribes: true,
        },
        orderBy: { createdAt: 'desc' }
    })

    const seasons = await prisma.survivorSeason.findMany({
        orderBy: { number: 'desc' }
    })

    const allUsers = await prisma.user.findMany({
        orderBy: { username: 'asc' }
    })

    return (
        <SurvivorLeaguesManager 
            leagues={leagues as LeagueWithDetails[]}
            seasons={seasons}
            allUsers={allUsers}
            currentUserId={currentUser.id}
        />
    )
}