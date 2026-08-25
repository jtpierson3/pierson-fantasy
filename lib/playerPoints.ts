import { prisma } from '@/lib/prisma'
import { Player } from '@prisma/client'

export type PlayerGameweekPoints = {
    points: number
    breakdown: unknown[]
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
        select: { playerId: true, points: true, breakdown: true }
    })

    const totals = new Map<number, PlayerGameweekPoints>()
    for (const row of rows) {
        const existing = totals.get(row.playerId)
        const rowBreakdown = Array.isArray(row.breakdown) ? row.breakdown : []
        if (existing) {
            existing.points += row.points
            existing.breakdown.push(...rowBreakdown)
        } else {
            totals.set(row.playerId, { points: row.points, breakdown: [...rowBreakdown] })
        }
    }
    return totals
}