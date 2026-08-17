export type ScoringRuleInput = {
    statKey: string
    displayName: string
    statTypeId: number | null
    position: string
    pointsPerUnit: number | null
    isGraduated: boolean
    tiers: { min: number; points: number }[] | null
}

export type PlayerStatsInput = {
    stats: Record<string, number>
    rating: number | null
    minutesPlayed: number
}

export type ScoreBreakdownLine = {
    label: string
    points: number
}

export type ScoreResult = {
    totalPoints: number
    breakdown: ScoreBreakdownLine[]
}

/**
 * Calculates a player's fantasy points for one fixture, given their raw stats and 
 * the position-specific scoring rules that apply to them. Pure - no I/O. Caller 
 * is reponsible for loading the right rules (filtered to this player's position)
 * and stats beforehand
 */
export function calculatePlayerPoints(
    playerStats: PlayerStatsInput,
    rules: ScoringRuleInput[],
    isCleanSheet: boolean
) : ScoreResult {
    const breakdown: ScoreBreakdownLine[] =[]

    // Base score - match rating
    const baseRating = playerStats.rating ?? 0
    breakdown.push({ label: 'Match Rating (base)', points: baseRating })

    for (const rule of rules) {
        if (rule.statKey === 'CLEAN_SHEET') {
            if (isCleanSheet && rule.pointsPerUnit) {
                breakdown.push({ label: rule.displayName, points: rule.pointsPerUnit })
            }
            continue
        }

        if (rule.isGraduated) {
            if (rule.statTypeId === null) continue
            const value = playerStats.stats[String(rule.statTypeId)]
            if (value === undefined || !rule.tiers) continue

            const sortedTiers = [...rule.tiers].sort((a, b) => b.min - a.min)
            const matchedTier = sortedTiers.find(t => value >= t.min)
            if (matchedTier && matchedTier.points > 0) {
                breakdown.push({ label: rule.displayName, points: matchedTier.points })
            }
            continue
        }

        // Flat per-unit stats
        if (rule.statTypeId === null || rule.pointsPerUnit === null) continue
        const count = playerStats.stats[String(rule.statTypeId)]
        if (!count) continue

        const points = count * rule.pointsPerUnit
        if (points !== 0) {
            breakdown.push({ label: rule.displayName, points })
        }
    }

    const totalPoints = breakdown.reduce((sum, line) => sum + line.points, 0)

    return { totalPoints: Math.round(totalPoints * 100) / 100, breakdown}
}