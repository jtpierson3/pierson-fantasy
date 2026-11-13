export type TeamForStandings = {
    id: string
    totalLeaguePoints: number
    totalFantasyPoints: number
    draftPosition: number | null
}

export type StandingsEntry<T extends TeamForStandings> = { 
    team: T
    rank: number
}

/**
 * Sorts teams into league standings order and ranks them (1-indexed)
 * 
 * - Normally: highest totalLeaguePoints first, totalFantasyPoints as the tiebreaker.
 *   Teams still level after that share a rank (1, 2, 2, 4).
 * - Pre-week-1, when every team is on 0 league points and 0 fantasy points, the order is draft
 *   position instead (pick 1 = rank 1; no draft position goes last). Equal draft positions share a rank.
 * 
 * Teams that share a rank are still listed in a stable order (by id) so the display never shuffles.
 */
export function getLeagueStandings<T extends TeamForStandings>(
    teams: T[]
): StandingsEntry<T>[] {
    const preSeason = teams.every(t => t.totalLeaguePoints === 0 && t.totalFantasyPoints === 0)

    const compare = (a: T, b: T): number => {
        if (preSeason) {
            const ad = a.draftPosition ?? Number.MAX_SAFE_INTEGER
            const bd = b.draftPosition ?? Number.MAX_SAFE_INTEGER
            return ad - bd
        }
        if (b.totalLeaguePoints !== a.totalLeaguePoints) {
            return b.totalLeaguePoints - a.totalLeaguePoints
        }
        return b.totalFantasyPoints - a.totalFantasyPoints
    }

    const sorted = [...teams].sort((a, b) => compare(a, b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

    let rank = 0
    return sorted.map((team, index) => {
        if (index === 0 || compare(sorted[index - 1], team) !== 0) rank = index + 1
        return { team, rank }
    })
}

/**
 * Convenience helper - find one specific teams rank within the standings
 */
export function getTeamRank<T extends TeamForStandings>(
    teams: T[],
    teamId: string
): number | null {
    const entry = getLeagueStandings(teams).find(e => e.team.id === teamId)
    return entry?.rank ?? null
}