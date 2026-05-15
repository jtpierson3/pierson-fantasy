import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PlayerBio from './PlayerBio'

export default async function PlayerBioPage({
    params,
} : {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    const player = await prisma.survivorPlayer.findUnique({
        where: { id },
        include: {
            contestants: {
            include: {
                survivorSeason: true,
                tribeMemberships: {
                include: { tribe: true }
                },
                episodeStats: {
                include: { event: true }
                },
                challengeResults: {
                where: { placement: 1 },
                include: { challenge: true }
                },
                votesReceived: {
                where: { isRevoked: false }
                },
            },
            orderBy: { survivorSeason: { number: 'desc' } }
            }
        }
    })

    if (!player) notFound()

    return <PlayerBio player={player} />
}
