import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import TransferReview from './TransferReview'

export default async function TransfersPage() {
    const { userId } = await auth()
    if (!userId) notFound()

    const currentUser = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!currentUser?.isSiteAdmin) notFound()

    const pendingTransfers = await prisma.playerTransfer.findMany({
        where: { status: 'pending_review' },
        include: { 
            player: { include: { team: true } },
            formerFantasyTeam: { include: { user: true } },
        },
        orderBy: { detectedAt: 'desc' }
    })

    const recentlyReviewed = await prisma.playerTransfer.findMany({
        where: { status: { in: ['confirmed', 'dismissed'] } },
        include: {
            player: true,
            formerFantasyTeam: { include: { user: true } },
        },
        orderBy: { reviewedAt: 'desc' },
        take: 20
    })

    return <TransferReview pendingTransfers={pendingTransfers} recentlyReviewed={recentlyReviewed} /> 
}