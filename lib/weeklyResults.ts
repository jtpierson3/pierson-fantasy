export type WeeklyMatchup = {
    homeTeamId: string
    awayTeamId: string
    homePoints: number
    awayPoints: number
}

export type WeeklyResult = 'win' | 'draw' | 'loss'

export type TeamWeeklyOutcome = {
    teamId: string
    result: WeeklyResult
    leaguePoints: number // 3 win, 1 draw, 0 loss
    score: number // team's fantasy points
}

const LEAGUE_POINTS: Record<WeeklyResult, number> = { win: 3, draw: 1, loss: 0 }

/**
 * League result for every team in a finalized gameweek.
 * A win is a win. A tied matchup is a draw. A matchup Loser still earns a draw if their 
 * score is in the league's top half of weekly scores (top half = floor(teams /2), extended
 * to include anyone tied with the last qualifying score).
 */
export function computeWeeklyResults(
    matchups: WeeklyMatchup[],
    totalTeamCount: number
): TeamWeeklyOutcome[] {
    const weeklyScores = matchups.flatMap(m => [
        { teamId: m.homeTeamId, score: m.homePoints },
        { teamId: m.awayTeamId, score: m.awayPoints },
    ])
    const sortedScores = [...weeklyScores].sort((a, b) => b.score - a.score)

    const cutoffBase = Math.floor(totalTeamCount / 2)
    let cutoffCount = cutoffBase
    if (cutoffBase > 0 && sortedScores.length > cutoffBase) {
        const lastInCutoff = sortedScores[cutoffBase - 1].score
        const nextScore = sortedScores[cutoffBase].score
        if (nextScore === lastInCutoff) cutoffCount = cutoffBase + 1
    }

    const topTeamIds = new Set<string>()
    if (cutoffCount > 0 && sortedScores.length > 0) {
        const threshold = sortedScores[Math.min(cutoffCount, sortedScores.length) - 1].score
        for (const s of sortedScores) {
            if (s.score >= threshold) topTeamIds.add(s.teamId)
        }
    }

    const outcome = (teamId: string, result: WeeklyResult, score: number): TeamWeeklyOutcome => ({
        teamId,
        result,
        leaguePoints: LEAGUE_POINTS[result],
        score,
    })

    return matchups.flatMap(m => {
        const homeWon = m.homePoints > m.awayPoints
        const awayWon = m.awayPoints > m.homePoints

        const resultFor = (teamId: string, won: boolean): WeeklyResult => {
            if (won) return 'win'
            if (!homeWon && ! awayWon) return 'draw' // exact tie in the matchup itself
            return topTeamIds.has(teamId) ? 'draw' : 'loss'
        }

        return [
            outcome(m.homeTeamId, resultFor(m.homeTeamId, homeWon), m.homePoints),
            outcome(m.awayTeamId, resultFor(m.awayTeamId, awayWon), m.awayPoints),
        ]
    })
}