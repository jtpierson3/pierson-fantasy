import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/apiAuth'
import { PICKABLE_CONTESTANT_STATUSES } from '@/lib/leagueRules'
import { getSwapWindow, SWAP_WINDOW_MESSAGES } from '@/lib/survivorSwapWindow'

export async function POST(req: Request) {
    try {
        const authResult = await requireUser()
        if (!authResult.ok) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }
        const { user } = authResult

        const { tribeId, swapOutId, swapInId } = await req.json()
        if (typeof tribeId !== 'string' || typeof swapOutId !== 'string' || typeof swapInId !== 'string') {
            return NextResponse.json({ error: 'tribeId, swapOutId and swapInId are required' }, { status: 400 })
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
        if (tribe.hasUsedMergeSwap) return NextResponse.json({ error: 'Tribe swap already used'}, { status: 400})

        const window = getSwapWindow(tribe.survivorLeague.survivorSeason.episodes)
        if (!window.open) {
            return NextResponse.json({ error: SWAP_WINDOW_MESSAGES[window.reason] }, { status: 400 })
        }

        const swapOutPick = tribe.players.find(p => p.contestantId === swapOutId)
        if (!swapOutPick) {
            return NextResponse.json({ error: 'Contestant not in tribe' }, { status: 404 })
        }

        if (tribe.players.some(p => p.contestantId === swapInId)) {
            return NextResponse.json({ error: 'That contestant is already in your tribe' }, { status: 400 })
        }

        const swapInContestant = await prisma.contestant.findFirst({
            where: {
                id: swapInId,
                survivorSeasonId: tribe.survivorLeague.survivorSeason.id,
                status: { in: PICKABLE_CONTESTANT_STATUSES },
            },
        })
        if (!swapInContestant) {
            return NextResponse.json({ error: 'Contestant not available' }, { status: 400 })
        }

        await prisma.$transaction([
            prisma.survivorPicks.delete({
                where: { id: swapOutPick.id }
            }),
            prisma.survivorPicks.create({
                data: {
                    tribeId,
                    contestantId: swapInId,
                    isSwap: true,
                    swappedFromId: swapOutId,
                }
            }),
            prisma.survivorFantasyLeagueTribe.update({
                where: { id: tribeId },
                data: { hasUsedMergeSwap: true }
            })
        ])  

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[tribe-swap] error:', err)
        return NextResponse.json({ error: 'Failed to save swap' }, { status: 500 })
    }
}