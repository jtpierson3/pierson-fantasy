import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/apiAuth'
import { getSwapWindow, SWAP_WINDOW_MESSAGES } from '@/lib/survivorSwapWindow'

export async function POST(req: Request) {
    try {
        const authResult = await requireUser()
        if (!authResult.ok) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }
        const { user } = authResult

        const { tribeId } = await req.json()
        if (typeof tribeId !== 'string') {
            return NextResponse.json({ error: 'tribeId is required' }, { status: 400 })
        }

        const tribe = await prisma.survivorFantasyLeagueTribe.findFirst({
            where: { id: tribeId, userId: user.id },
            include: { 
                players: true,
                survivorLeague: {
                    include: { survivorSeason: { include: { episodes: true } } },
                },
            },
        })
        if (!tribe) return NextResponse.json({ error: 'Tribe not found' }, { status: 404 })
        if (!tribe.hasUsedMergeSwap) return NextResponse.json({ error: 'No swap to reset' }, { status: 404 })

        const window = getSwapWindow(tribe.survivorLeague.survivorSeason.episodes)
        if (!window.open) {
            return NextResponse.json({ error: SWAP_WINDOW_MESSAGES[window.reason] }, { status: 400 })
        }

        const existingSwap = tribe.players.find(p => p.isSwap)
        if (!existingSwap?.swappedFromId) return NextResponse.json({ error: 'No swap found' }, { status: 404 })

        await prisma.$transaction([
            prisma.survivorPicks.delete({ where: { id: existingSwap.id } }),
            prisma.survivorPicks.create({
                data: {
                    tribeId,
                    contestantId: existingSwap.swappedFromId,
                }
            }),
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