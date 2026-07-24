export type GameweekWithLockInfo = {
    id: string
    gameweekNumber: number
    lockTime: Date | null
}

export type GameweekWithDateRange = {
    id: string
    gameweekNumber: number
    startDate: Date
    endDate: Date
}

/**
 * Given a league's gameweeks in order, finds whichever one is chronologically
 * "closest" to now for the display puposes - e.g. showing the just-finished
 * matchup right up until the midpoint between last week's final kickoff and
 * next week's first kickoff, then switching to the upcoming one.
 */
export function selectClosestGameweek(
    gameweeks: GameweekWithDateRange[],
    now: Date
): GameweekWithDateRange | null {
    if (gameweeks.length === 0) return null

    for (let i= 0; i < gameweeks.length - 1; i++) {
        const current = gameweeks[i]
        const next = gameweeks[i + 1]
        const midpoint = new Date(
            (current.endDate.getTime() + next.startDate.getTime()) / 2
        )

        if (now < midpoint) return current
    }

    return gameweeks[gameweeks.length - 1]
}

/**
 * Given a league's gameweeks (in order) paired with their computed lock times,
 * determines which gameweek is currently being set - the earliest one whose
 * lock time hasn't passed yet. If a gameweek has no lock time (no fixtures
 * found fir its date range), it's treated as still open/unset.
 */
export function selectTargetGameweek(
    gameweeks: GameweekWithLockInfo[],
    now: Date
) : GameweekWithLockInfo | null {
    for (const gw of gameweeks) {
        if (!gw.lockTime || now < gw.lockTime) {
            return gw
        }
    }
    return null
}