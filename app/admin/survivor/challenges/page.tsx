import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ChallengeLibrary from './ChallengeLibrary'

export default async function ChallengeLibraryPage() {
    const { userId } = await auth()
    if (!userId) notFound()

    const currentUser = await prisma.user.findUnique({
        where: { clerkId: userId }
    })
    if (!currentUser?.isSiteAdmin) notFound()

    const challenges = await prisma.survivorChallenge.findMany({
        include: {
            challenges: {
                include: {
                    episode: {
                        include: {
                            survivorSeason: true
                        }
                    }
                }
            }
        },
        orderBy: { name: 'asc' }
    })

    return <ChallengeLibrary challenges={challenges} />
}