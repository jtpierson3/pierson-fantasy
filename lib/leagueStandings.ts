export type TeamForStandings = {
    id: string
    totalLeaguePoints: number
    totalFantasyPoints: number
}

export type StandingsEntry<T extends TeamForStandings> = { 
    team: T
    rank: number
}

/**
 * Sorts teams into league standings order - highest totalLeaguePoints first,
 * with totalFantasyPoints as the tiebreaker. REturns each team paired with its 1-indexed rank
 */
export function getLeagueStandings<T extends TeamForStandings>(
    teams: T[]
): StandingsEntry<T>[] {
    const sorted = [...teams].sort((a,b) => {
        if (b.totalLeaguePoints !== a.totalLeaguePoints) {
            return b.totalLeaguePoints - a.totalLeaguePoints
        }
        return b.totalFantasyPoints - a.totalFantasyPoints
    })

    return sorted.map((team, index) => ({
        team,
        rank: index + 1
    }))
}

/**
 * Convenience helper - find one specific teams rank within the standings
 */
export function getTeamRank<T extends TeamForStandings>(
    teams: T[],
    teamId: string
): number | null {
    const standings = getLeagueStandings(teams)
    const entry = standings.find(e => (e.team as { id: string }).id === teamId)
    return entry?.rank ?? null
}