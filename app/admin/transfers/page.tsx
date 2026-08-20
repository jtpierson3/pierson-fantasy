import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import TransferReview from './TransferReview'
import { nameSimilarity } from '@/lib/nameMatching'

const SIMILARITY_THRESHOLD = 0.75

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

    const reservedPlayers = await prisma.player.findMany({
        where: {id: { lt: 0 } },
        orderBy: { display_name: 'asc' }
    })

    const reservedPlayerIds = reservedPlayers.map(p => p.id)
    const reservationOwnership = await prisma.fantasyTeamPlayer.findMany({
        where: { playerId: { in: reservedPlayerIds } },
        include: { fantasyTeam: { include: { user: true } } }
    })
    const ownerByPlayerId = new Map(
        reservationOwnership.map(r => [r.playerId, { teamName: r.fantasyTeam.name, username: r.fantasyTeam.user.username }])
    )

    const recentRealPlayers = await prisma.player.findMany({
        where: { 
            id: { gt: 0 },
            updatedAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000)}
        },
        select: { id: true, display_name: true, image_path: true, teamId: true, team: true }
    })

    const suggestedMatches = reservedPlayers.flatMap(reserved => {
        return recentRealPlayers
            .map(real => ({
                reserved: {
                    id: reserved.id,
                    name: reserved.display_name,
                    currentClubName: reserved.currentClubName,
                    reservedAt: reserved.updatedAt.toISOString(),
                    owner: ownerByPlayerId.get(reserved.id) ?? null
                },
                real: {
                    id: real.id,
                    name: real.display_name,
                    image_path: real.image_path,
                    teamName: real.team?.name ?? null
                },
                similarity: nameSimilarity(reserved.display_name, real.display_name)
            }))
            .filter(m => m.similarity >= SIMILARITY_THRESHOLD)
    })

    const allReservedForDisplay = reservedPlayers.map(reserved => ({
        id: reserved.id,
        name: reserved.display_name,
        currentClubName: reserved.currentClubName,
        reservedAt: reserved.updatedAt.toISOString(),
        owner: ownerByPlayerId.get(reserved.id) ?? null
    }))

    return (
        <TransferReview 
            pendingTransfers={pendingTransfers} 
            recentlyReviewed={recentlyReviewed} 
            suggestedMatches={suggestedMatches}
            allReservedPlayers={allReservedForDisplay}
        /> 
    )
}