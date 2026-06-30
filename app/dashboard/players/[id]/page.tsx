import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import PlayerProfile from './PlayerProfile'

export default async function PlayerPage({
    params,
}: {
    params: Promise<{id: string}>
}) {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const { id } = await params

    const player = await prisma.player.findUnique({
        where: { id: parseInt(id) },
        include: {
            team: true
        }
    })

    if (!player) notFound()

    return <PlayerProfile player={player} />
}