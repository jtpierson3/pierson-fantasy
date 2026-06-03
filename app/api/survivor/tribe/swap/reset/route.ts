import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({ where: { clerkId } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { tribeId } = await req.json()

        // Verify tribe belongs to user
        const tribe = await prisma.survivorFantasyLeagueTribe.findFirst({
            where: { id: tribeId, userId: user.id },
            include: { 
                players: true
            }
        })

        if (!tribe) return NextResponse.json({ error: 'Tribe not found' }, { status: 404 })
        if (!tribe.hasUsedMergeSwap) return NextResponse.json({ error: 'No swap to reset' }, { status: 404 })

        //Find the existing swap
        const existingSwap = tribe.players.find(p => p.isSwap)
        if (!existingSwap?.swappedFromId) return NextResponse.json({ error: 'No swap found' }, { status: 404 })

        await prisma.$transaction([
            //Remove swapped in player
            prisma.survivorPicks.delete({ where: { id: existingSwap.id } }),
            //Restore swapped out player
            prisma.survivorPicks.create({
                data: {
                    tribeId,
                    contestantId: existingSwap.swappedFromId,
                }
            }),
            //Reset swap flag
            prisma.survivorFantasyLeagueTribe.update({
                where: { id: tribeId },
                data: { hasUsedMergeSwap: false }
            })
        ])

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[tribe-swap-reset] error:', err)
        return NextResponse.json({ error: 'Failed to reset swap' }, { status: 500 })
    }
}