import { FantasyCompetition } from "@prisma/client"

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

export function selectClosestGameweekForCompetition(
    gameweeks: (GameweekWithDateRange & { competition: FantasyCompetition })[],
    competition: FantasyCompetition,
    now: Date
) {
    return selectClosestGameweek(gameweeks.filter(g => g.competition === competition), now)
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

export const COMPETITION_TO_FIXTURE_KEY: Record<FantasyCompetition, string> = {
    premier_league: 'premier_league',
    league_cup: 'carabao_cup',
    domestic_cup: 'fa_cup',
}

export type GameweekForLockTime = GameweekWithDateRange & {
    competition: FantasyCompetition
}

export type FixtureKickoff = {
    kickoff: Date | null
    competition: string
}

/**
 * In-memory equivalent of getGameweekLockTime for many gameweeks at once: each gameweek's
 * lock time is the earliest kickoff within its date range for its competition's fixtures.
 */
export function computeGameweekLockTimes(
    gameweeks: GameweekForLockTime[],
    fixtures: FixtureKickoff[]
): GameweekWithLockInfo[] {
    return gameweeks.map(gw => {
        const key = COMPETITION_TO_FIXTURE_KEY[gw.competition]
        let lockTime: Date | null = null
        for (const f of fixtures) {
            if (!f.kickoff || f.competition !== key) continue
            if (f.kickoff < gw.startDate || f.kickoff > gw.endDate) continue
            if (lockTime === null || f.kickoff < lockTime) lockTime = f.kickoff
        }
        return { id: gw.id, gameweekNumber: gw.gameweekNumber, lockTime}
    })
}