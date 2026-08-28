export type TeamForWaiverOrder = {
    id: string
    totalLeaguePoints: number
    totalFantasyPoints: number
    draftPosition: number | null
}

/**
 * Waiver line order for a league. Worst team in the standings goes first.
 * Ties in standings resolve by lower fantasy points total (except 
 * pre-week-1, when every team is 0-0 fall throughto draft position -
 * earliest pick = later in the waiver line.)
 * 
 * Returns teamId => 1-based line position (1 = claims first)
 */
export function getWaiverPriorityOrder(teams: TeamForWaiverOrder[]): Map<string, number> {
    const sorted = [...teams].sort((a, b) => {
        if (a.totalLeaguePoints !== b.totalLeaguePoints) return a.totalLeaguePoints - b.totalLeaguePoints
        if (a.totalFantasyPoints !== b.totalFantasyPoints) return a.totalFantasyPoints - b.totalFantasyPoints
        const ad = a.draftPosition ?? Number.MAX_SAFE_INTEGER
        const bd = b.draftPosition ?? Number.MAX_SAFE_INTEGER
        if (ad !== bd) return bd - ad
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })
    return new Map(sorted.map((t, i) => [t.id, i + 1]))
}