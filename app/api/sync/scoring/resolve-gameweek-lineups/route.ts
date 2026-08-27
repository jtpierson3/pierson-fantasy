import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { resolveGameweekLineup } from '@/lib/lineupResolution'
import { resolveCupGameweekForAllTeams } from '@/lib/cupScoring'

export async function POST(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { gameweekId } = await req.json()
    if (!gameweekId) return NextResponse.json({ error: 'gameweekId is required' }, { status: 400 })

    const gameweek = await prisma.fantasyGameweek.findUnique({
        where: { id: gameweekId }
    })
    if (!gameweek) return NextResponse.json({ error: 'Gameweek not found' }, { status: 404 })

    if (gameweek.competition !== 'premier_league') {
        const resolvedCount = await resolveCupGameweekForAllTeams(gameweekId)
        return NextResponse.json({ success: true, teamsResolved: resolvedCount })
    }

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
                if (result.rule === 'NONE') continue
                
                const starterRow = starterRows.find(r => r.slotOrder === result.slotIndex)
                if (!starterRow) continue

                // Thes starter's row now displays the resplacement players
                await prisma.gameweekLineupPlayer.update({
                    where: { id: starterRow.id },
                    data: {
                        resolvedPlayerId: result.finalPlayer.playerId,
                        subRule: result.rule,
                        resolvedAt: new Date()
                    }
                })

                // The REPLACEMENT's own original row (their bench slot) now displays the 
                // DISPLACED starrter instead - a clean symmetric swap
                if (result.displacedPlayer) {
                    const replacementOwnRow = lineup.players.find(p => p.playerId === result.finalPlayer!.playerId)
                    if (replacementOwnRow) {
                        await prisma.gameweekLineupPlayer.update({
                            where: { id: replacementOwnRow.id },
                            data: { 
                                resolvedPlayerId: result.displacedPlayer.playerId,
                                subRule: result.rule,
                                displacedByPlayerId: result.finalPlayer.playerId,
                                resolvedAt: new Date()
                            }
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