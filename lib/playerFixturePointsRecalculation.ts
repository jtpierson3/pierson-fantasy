import { prisma } from '@/lib/prisma'
import { calculatePlayerPoints, type PlayerStatsInput, type ScoringRuleInput } from '@/lib/scoringCalculation'
import { qualifiesForCleanSheet } from '@/lib/scoringRules'
import { getPositionType, toScoringPosition } from '@/lib/formations'

export class RecalculationError extends Error {
    constructor(message: string, public status: number) {
        super(message)
    }
}

/**
 * Recomputes and persists PlayerFixturePoints for a single PlayerMatchStats row,
 * optionally correcting positionPlayedId first. Shared by the automated sync pipeline
 * (calculate-fixture-points) and the admin position-correction action, so both paths 
 * score a player identically
 */
export async function recalculatePlayerFixturePoints(
    playerMatchStatsId: string,
    positionPlayedId: number,
    options: { manual?: boolean } = {}
): Promise<{ points: number; breakdown: unknown; playerId: number; gameweekNumber: number | null }> {
    const ps = await prisma.playerMatchStats.findUnique({
        where: { id: playerMatchStatsId },
        include: { player: true, fixture: true }
    })
    if (!ps) throw new RecalculationError('PlayerMatchStats not found', 404)

    if (positionPlayedId !== ps.positionPlayedId || options.manual) {
        await prisma.playerMatchStats.update({
            where: { id: playerMatchStatsId },
            data: {
                positionPlayedId,
                ...(options.manual ? { positionManuallySet: true }: {})
            }
        })
    }

    const broadPositionId = positionPlayedId === 24 ? 24 : null
    const positionType = getPositionType(positionPlayedId, broadPositionId)
    const scoringPosition = toScoringPosition(positionType)
    if (!scoringPosition) {
        throw new RecalculationError('positionPlayedId does not resolve to a scorable position', 400)
    }

    const rules = await prisma.scoringRule.findMany({
        where: { isActive: true, position: scoringPosition }
    })
    const ruleInputs: ScoringRuleInput[] = rules.map(r => ({
        statKey: r.statKey,
        displayName: r.displayName,
        statTypeId: r.statTypeId,
        position: r.position,
        pointsPerUnit: r.pointsPerUnit,
        isGraduated: r.isGraduated,
        tiers: r.tiers as { min: number; points: number }[] | null,
    }))

    const fixture = ps.fixture
    const teamGoalsConceded = ps.player.teamId === fixture.homeTeamId
        ? (fixture.awayScore ?? 0)
        : (fixture.homeScore ?? 0)
    const isCleanSheet = qualifiesForCleanSheet(teamGoalsConceded, ps.minutesPlayed)

    const statsInput: PlayerStatsInput = {
        stats: (ps.stats as Record<string, number>) ?? {},
        rating: ps.rating,
        minutesPlayed: ps.minutesPlayed,
    }

    const { totalPoints, breakdown } = calculatePlayerPoints(statsInput, ruleInputs, isCleanSheet)

    await prisma.playerFixturePoints.upsert({
        where: { playerId_fixtureId: { playerId: ps.playerId, fixtureId: ps.fixtureId } },
        update: { points: totalPoints, breakdown },
        create: { playerId: ps.playerId, fixtureId: ps.fixtureId, points: totalPoints, breakdown }
    })

    return { points: totalPoints, breakdown, playerId: ps.playerId, gameweekNumber: ps.fixture.gameweekNumber }
}