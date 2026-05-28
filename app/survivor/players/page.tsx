import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import PlayerBrowser from './PlayerBrowser'

async function PlayerBrowserContent() {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const players = await prisma.survivorPlayer.findMany({
        include: {
            contestants: {
                include: {
                    survivorSeason: true,
                    tribeMemberships: {
                        where: { isCurrent: true },
                        include: { tribe: true }
                    }
                },
                orderBy: { survivorSeason: { number: 'desc' } }
            }
        },
        orderBy: { name: 'asc' }
    })

    const seasons = await prisma.survivorSeason.findMany({
        orderBy: { number: 'desc' },
        select: { id: true, number: true, title: true }
    })

    return <PlayerBrowser players={players} seasons={seasons} />
}

export default function PlayerBrowserPage() {
    return(
        <Suspense fallback={
            <div className="p-6 flex-items-center justify-center">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <PlayerBrowserContent />
        </Suspense>
    )
}