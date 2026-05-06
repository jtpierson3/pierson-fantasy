import type {
    FantasyTeam, 
    FantasyMatchup,
    FantasyGameweek,
    FantasyLeague,
    User,
} from '@prisma/client'

export type TeamWithRecord = FantasyTeam & {
    user: User
    homeMatchups: FantasyMatchup[]
    awayMatchups: FantasyMatchup[]
}

export type MatchupWithTeams = FantasyMatchup & {
    homeTeam: TeamWithRecord
    awayTeam: TeamWithRecord
    gameweek: FantasyGameweek
}

export type GameweekWithMatchups = FantasyGameweek & {
    matchups: MatchupWithTeams[]
}

export type LeagueWithData = FantasyLeague & {
    teams: TeamWithRecord[]
    gameweeks: GameweekWithMatchups[]
}

export function getMatchResult(
    matchup: FantasyMatchup,
    teamId: string
): 'W' | 'L' | 'D' | null {
    if (!matchup.isComplete) return null
    const isHome = matchup.homeTeamId === teamId
    const myPoints = isHome ? matchup.homePoints : matchup.awayPoints
    const theirPoints = isHome ? matchup.awayPoints : matchup.homePoints
    if (myPoints > theirPoints) return 'W'
    if (myPoints < theirPoints) return 'L'
    return 'D'
}

export function getTeamMatchups(
    team: TeamWithRecord,
    gameweeks: GameweekWithMatchups[]
): MatchupWithTeams[] {
    return gameweeks
        .flatMap(gw => gw.matchups)
        .filter(m => m.homeTeamId === team.id || m.awayTeamId === team.id)
        .sort((a,b) => a.gameweek.gameweekNumber - b.gameweek.gameweekNumber)
}

export function getOpponent(
    matchup: MatchupWithTeams,
    teamId: string
): TeamWithRecord {
    return matchup.homeTeamId === teamId ? matchup.awayTeam : matchup.homeTeam
}

export function getMyPoints(matchup: FantasyMatchup, teamId: string): number {
    return matchup.homeTeamId === teamId ? matchup.homePoints : matchup.awayPoints
}

export function getTheirPoints(matchup: FantasyMatchup, teamId: string): number {
    return matchup.homeTeamId === teamId ? matchup.awayPoints : matchup.homePoints
}