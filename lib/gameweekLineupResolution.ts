import { prisma } from '@/lib/prisma'
import { resolveGameweekLineup } from '@/lib/lineupResolution'

/**
 * Resolves Auto-Substitutions for one team's premier league gameweek lineup and persists
 * the result. Shared by the bulk automation route (resolve-gameweek-lineups) and any 
 * targeted admin re-resolve (e.g. after a position correction), so both paths write 
 * with identical results.
 */
export async function resolveAndPersistLineup(fantasyTeamId: string, gameweekId: string): Promise<boolean> {
    const results = await resolveGameweekLineup(fantasyTeamId, gameweekId)
    if (!results) return false

    const lineup = await prisma.gameweekLineup.findUnique({
        where: { fantasyTeamId_gameweekId: { fantasyTeamId, gameweekId } },
        include: { players: true }
    })
    if (!lineup) return false

    const starterRows = lineup.players.filter(p => p.rosterSlot === 'STARTER')

    // Clear any stale resolution data from a previous run, since a slot that was resolved 
    // last time might now resolve differently, or not at all.
    await prisma.gameweekLineupPlayer.updateMany({
        where: { gameweekLineupId: lineup.id },
        data: { resolvedPlayerId: null, subRule: null, displacedByPlayerId: null, resolvedAt: null }
    })

    for (const result of results) {
        if (result.rule === 'NONE') continue

        const starterRow = starterRows.find(r => r.slotOrder === result.slotIndex)
        if (!starterRow) continue

        await prisma.gameweekLineupPlayer.update({
            where: { id: starterRow.id },
            data: {
                resolvedPlayerId: result.finalPlayer.playerId,
                subRule: result.rule,
                resolvedAt: new Date()
            }
        })

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

    return true 
}