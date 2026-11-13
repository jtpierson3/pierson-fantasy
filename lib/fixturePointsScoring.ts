import {
    calculatePlayerPoints,
    type ScoreBreakdownLine,
    type ScoringRuleInput,
} from '@/lib/scoringCalculation'
import { qualifiesForCleanSheet } from '@/lib/scoringRules'
import { getPositionType, toScoringPosition, type ScoringPosition } from '@/lib/formations'
import { getTeamGoalsConceded, type FixtureSides } from '@/lib/goalsConceded'
import { toBroadPositionId } from '@/lib/positions'

/** Maps a ScoringRule database row to the shape calculatePlayerPoints takes. */
export function toScoringRuleInput(rule: {
    statKey: string
    displayName: string
    statTypeId: number | null
    position: string
    pointsPerUnit: number | null
    isGraduated: boolean
    tiers: unknown
}): ScoringRuleInput {
    return {
        statKey: rule.statKey,
        displayName: rule.displayName,
        statTypeId: rule.statTypeId,
        position: rule.position,
        pointsPerUnit: rule.pointsPerUnit,
        isGraduated: rule.isGraduated,
        tiers: rule.tiers as { min: number; points: number }[] | null
    }
}

/** Groups active ScoringRule rows by the position they apply to. */
export function groupRulesByPosition(
    rules: Parameters<typeof toScoringRuleInput>[0][]
): Map<string, ScoringRuleInput[]> {
    const byPosition = new Map<string, ScoringRuleInput[]>()
    for (const rule of rules) {
        const list = byPosition.get(rule.position) ?? []
        list.push(toScoringRuleInput(rule))
        byPosition.set(rule.position, list)
    }
    return byPosition
}

export type PlayerMatchScore =
    | { scored: false }
    | {
        scored: true
        scoringPosition: ScoringPosition
        totalPoints: number
        breakdown: ScoreBreakdownLine[]
        /** Played but couldn't find out which side they played for - so no clean sheet awarded. */
        sideUnknown: boolean
    }

/**
 * The one place a player's points for one fixture are decided. Used by both the automated pipeline
 * (calculateFixturePoints) and the admin position correction.
 * (recalculatePlayerFixturePoints), so they cannont disagree. Pure - callers load the data and 
 * persist the result.
 * 
 * - Position comes from the MATCH (positionPlayedId), never the player's stored position.
 *   positionPlayedId 24 is the Sportmonks' broad "Goalkeeper" and is authoritative for GK.
 * - Clean sheet uses the side the player played for in this match (matchTeamId), falling back
 *   to their current club only for rows synced before the match team was stored.
 */
export function scorePlayerMatchStats(args: {
    positionPlayedId: number | null
    matchTeamId: number | null
    playerClubId: number | null
    fixture: FixtureSides
    stats: unknown
    rating: number | null
    minutesPlayed: number
    rulesByPosition: ReadonlyMap<string, ScoringRuleInput[]>
}): PlayerMatchScore {
    const { positionPlayedId, matchTeamId, playerClubId, fixture, rating, minutesPlayed, rulesByPosition } = args

    const broadPositionId = toBroadPositionId(positionPlayedId)
    const positionType = getPositionType(positionPlayedId, broadPositionId)
    const scoringPosition = toScoringPosition(positionType)
    if (!scoringPosition) return { scored: false }

    const goalsConceded = getTeamGoalsConceded({
        matchTeamId,
        fallbackTeamId: playerClubId,
        fixture,
    })
    const isCleanSheet = goalsConceded !== null && qualifiesForCleanSheet(goalsConceded, minutesPlayed)

    const { totalPoints, breakdown } = calculatePlayerPoints(
        {
            stats: (args.stats as Record<string, number> | null) ?? {},
            rating,
            minutesPlayed,
        },
        rulesByPosition.get(scoringPosition) ?? [],
        isCleanSheet
    )

    return {
        scored: true,
        scoringPosition,
        totalPoints,
        breakdown,
        sideUnknown: goalsConceded === null && minutesPlayed > 0,
    }
}