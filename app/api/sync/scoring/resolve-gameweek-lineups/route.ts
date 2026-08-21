import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { resolveGameweekLineup } from '@/lib/lineupResolution'

export async function POST(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { gameweekId } = await req.json()
    if (!gameweekId) return NextResponse.json({ error: 'gameweekId is required' }, { status: 400 })

    try {
        const lineups = await prisma.gameweekLineup.findMany({
            where: { gameweekId },
            include: { players: true }
        })

        let resolvedCount = 0

        for (const lineup of lineups) {
            const results = await resolveGameweekLineup(lineup.fantasyTeamId, gameweekId)
            if (!results) continue

            const starterRows = lineup.players.filter(p => p.rosterSlot === 'STARTER')

            // First pass - clear any stale resolution data from a previous run,
            // since a slot that was resolved last time might now resolve differently
            // (or not at all) with fresh data
            await prisma.gameweekLineupPlayer.updateMany({
                where: { gameweekLineupId: lineup.id },
                data: { resolvedPlayerId: null, subRule: null, displacedByPlayerId: null, resolvedAt: null }
            })

            for (const result of results) {
                const starterRow = starterRows.find(r => r.slotOrder === result.slotIndex)
                if (!starterRow) continue

                const changed = result.rule !== 'NONE'

                await prisma.gameweekLineupPlayer.update({
                    where: { id: starterRow.id },
                    data: {
                        resolvedPlayerId: changed ? result.finalPlayer.playerId : null,
                        subRule: changed ? result.rule : null,
                        resolvedAt: new Date()
                    }
                })

                // If someone else was displaced INTO this slot, mark who displaced whom
                // on the DISPLACED player's own row (for the OUT icon)
                if (result.displacedPlayer) {
                    const displacedRow = lineup.players.find(p => p.playerId === result.displacedPlayer!.playerId)
                    if (displacedRow) {
                        await prisma.gameweekLineupPlayer.update({
                            where: { id: displacedRow.id },
                            data: { displacedByPlayerId: result.finalPlayer.playerId }
                        })
                    }
                }
            }
            resolvedCount++
        }

        return NextResponse.json({ success: true, teamsResolved: resolvedCount })
    } catch (err) {
        console.error('[resolve-gameweek-lineups] error:', err)
        return NextResponse.json({ error: 'Failed to resolve gameweek lineups' }, { status: 500 })
    }
}