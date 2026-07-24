export type MatchupTeamRef = {
    id: string
}

export type MatchupForHelpers<T extends MatchupTeamRef> = {
    homeTeamId: string
    awayTeamId: string
    homePoints: number
    awayPoints: number
    homeTeam: T
    awayTeam: T
}

/**
 * Given a matchup and a team's id, returns that team's opponent.
 */
export function getOpponent<T extends MatchupTeamRef>(
    matchup: MatchupForHelpers<T>,
    currentTeamId: string
): T {
    return matchup.homeTeamId === currentTeamId ? matchup.awayTeam : matchup.homeTeam
}

/**
 * Given a matchup and a team's id, returns that team's own points for this matchup
 */
export function getMyPoints<T extends MatchupTeamRef>(
    matchup: MatchupForHelpers<T>,
    currentTeamId: string
): number {
    return matchup.homeTeamId === currentTeamId ? matchup.homePoints : matchup.awayPoints
}

/**
 * Given a matchup and a team's id, returns the opponent's points for this matchup
 */
export function getTheirPoints<T extends MatchupTeamRef>(
    matchup: MatchupForHelpers<T>,
    currentTeamId: string
): number {
    return matchup.homeTeamId === currentTeamId ? matchup.awayPoints : matchup.homePoints
}