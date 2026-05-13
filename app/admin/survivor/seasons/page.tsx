import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import SeasonsManager from './seasonsManager'

export default async function SurvivorSeasonsPage() {
    const { userId } = await auth()
    if (!userId) notFound()

    const currentUser = await prisma.user.findUnique({
        where: { clerkId: userId }
    })

    if (!currentUser?.isSiteAdmin) notFound()

    const seasons = await prisma.survivorSeason.findMany({
        include: {
            contestants: true,
            episodes: true,
            tribes: true,
        },
        orderBy: { number: 'desc' },
    })

    return <SeasonsManager seasons={seasons} />
}