import { prisma } from '@/lib/prisma'
import { groupRulesByPosition, scorePlayerMatchStats } from '@/lib/fixturePointsScoring'

export class RecalculationError extends Error {
    constructor(message: string, public status: number) {
        super(message)
    }
}

/**
 * Recomputes and persists PlayerFixturePoints for a single PlayerMatchStats row,
 * optionally correcting positionPlayedId first - the admin position-correction action.
 * The scoring decision itself lives in scorePlayerMatchStats, the same function the
 * automated pipeline (calculateFixturePoints) uses, so both score a player identically.
 */
export async function recalculatePlayerFixturePoints(
    playerMatchStatsId: string,
    positionPlayedId: number,
    options: { manual?: boolean } = {}
): Promise<{ points: number; breakdown: unknown; playerId: number; gameweekNumber: number | null }> {
    const playerStat = await prisma.playerMatchStats.findUnique({
        where: { id: playerMatchStatsId },
        include: { player: true, fixture: true }
    })
    if (!playerStat) throw new RecalculationError('PlayerMatchStats not found', 404)

    if (positionPlayedId !== playerStat.positionPlayedId || options.manual) {
        await prisma.playerMatchStats.update({
            where: { id: playerMatchStatsId },
            data: {
                positionPlayedId,
                ...(options.manual ? { positionManuallySet: true } : {})
            }
        })
    }

    const allRules = await prisma.scoringRule.findMany({ where: { isActive: true } })

    const result = scorePlayerMatchStats({
        positionPlayedId,
        matchTeamId: playerStat.teamId,
        playerClubId: playerStat.player.teamId,
        fixture: playerStat.fixture,
        stats: playerStat.stats,
        rating: playerStat.rating,
        minutesPlayed: playerStat.minutesPlayed,
        rulesByPosition: groupRulesByPosition(allRules),
    })
    if (!result.scored) {
        throw new RecalculationError('positionPlayedId does not resolve to a scorable position', 400)
    }

    if (result.sideUnknown) {
        console.warn(`[recalculatePlayerFixturePoints] can't tell which side player ${playerStat.playerId} played for in fixture ${playerStat.fixtureId} - no clean sheet awarded`)
    }

    await prisma.playerFixturePoints.upsert({
        where: { playerId_fixtureId: { playerId: playerStat.playerId, fixtureId: playerStat.fixtureId } },
        update: { points: result.totalPoints, breakdown: result.breakdown },
        create: { playerId: playerStat.playerId, fixtureId: playerStat.fixtureId, points: result.totalPoints, breakdown: result.breakdown }
    })

    return { points: result.totalPoints, breakdown: result.breakdown, playerId: playerStat.playerId, gameweekNumber: playerStat.fixture.gameweekNumber }
}