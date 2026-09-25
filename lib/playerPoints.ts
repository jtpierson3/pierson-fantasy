import { prisma } from '@/lib/prisma'

export type PlayerGameweekPoints = {
    points: number
    breakdown: unknown[]
    playerMatchStatsId: string | null
    positionPlayedId: number | null
    minutesPlayed: number
}

/**
 * Fetches calculated fantasy points for a set of players in a specific gameweek,
 * returning a map of playerId -> { points, breakdown } for easy lookup. 
 * Players with no calculated points yet (fixture not played/scored) are simply absent from 
 * the map - callers should default points to 0 and breakdown to an empty array.
 */
export async function getPlayerPointsForGameweek(
    playerIds: number[],
    gameweekNumber: number
): Promise<Map<number, PlayerGameweekPoints>> {
    const rows = await prisma.playerFixturePoints.findMany({
        where: { 
            playerId: { in: playerIds }, 
            fixture: { gameweekNumber } 
        },
        select: { playerId: true, points: true, breakdown: true, fixtureId: true }
    })

    const statsRows = await prisma.playerMatchStats.findMany({
        where: { playerId: { in: playerIds }, fixture: { gameweekNumber } },
        select: { id: true, playerId: true, positionPlayedId: true, minutesPlayed: true }
    })

    // A player normally has one exactly one fixture per gameweek; if a competition ever gives them
    // two in the same week, this takes the first and the admin correction UI will only affect that
    // one - acceptable since this is where and multi-fixture correction isn't in scope yet.
    const statsByPlayerId = new Map(statsRows.map(s => [s.playerId, s]))

    const totals = new Map<number, PlayerGameweekPoints>()
    for (const row of rows) {
        const existing = totals.get(row.playerId)
        const rowBreakdown = Array.isArray(row.breakdown) ? row.breakdown : []
        if (existing) {
            existing.points += row.points
            existing.breakdown.push(...rowBreakdown)
        } else {
            const stats = statsByPlayerId.get(row.playerId)
            totals.set(row.playerId, {
                points: row.points,
                breakdown: [...rowBreakdown],
                playerMatchStatsId: stats?.id ?? null,
                positionPlayedId: stats?.positionPlayedId ?? null,
                minutesPlayed: stats?.minutesPlayed ?? 0,
            })
        }
    }
    return totals
}