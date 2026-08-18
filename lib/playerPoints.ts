import { prisma } from '@/lib/prisma'

/**
 * Fetches calculated fantasy points for a set of players in a specific fixture,
 * returning a map of playerId -> points for easy lookup. Players with no calculated
 * points yet (fixture not played/scored) are simply absent from the map - callers
 * should default to 0
 */
export async function getPlayerPointsForGameweek(
    playerIds: number[],
    gameweekNumber: number
): Promise<Map<number, number>> {
    const rows = await prisma.playerFixturePoints.findMany({
        where: { 
            playerId: { in: playerIds }, 
            fixture: { gameweekNumber } 
        },
        select: { playerId: true, points: true }
    })

    const totals = new Map<number, number>()
    for (const row of rows) {
        totals.set(row.playerId, (totals.get(row.playerId) ?? 0) + row.points)
    }
    return totals
}