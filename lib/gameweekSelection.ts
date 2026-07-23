export type GameweekWithLockInfo = {
    id: string
    gameweekNumber: number
    lockTime: Date | null
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