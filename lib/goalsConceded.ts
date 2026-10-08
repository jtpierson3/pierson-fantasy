export type FixtureSides = {
    homeTeamId: number | null
    awayTeamId: number | null
    homeScore: number | null
    awayScore: number | null
}

/**
 * Goals conceded by the side a player actually played for in a fixture, or null when we can't
 * tell which side that was. matchTeamId (from the match's lineup) is the real answer; fallbackTeamId
 * (Player.teamId, i.e. the CURRENT club) only covers rows synced before matchTeamId was stored, and is
 * wrong for anyone who has since moved. Ids are compared strictly and a missing id never matches, so an
 * untracked (null) home or away side can't be mistaken for a player with no club.
 */
export function getTeamGoalsConceded(args: {
    matchTeamId: number | null
    fallbackTeamId: number | null
    fixture: FixtureSides
}): number | null {
    const { matchTeamId, fallbackTeamId, fixture } = args
    const teamId = matchTeamId ?? fallbackTeamId
    if (teamId === null) return null

    if (teamId === fixture.homeTeamId) return fixture.awayScore ?? 0
    if (teamId === fixture.awayTeamId) return fixture.homeScore ?? 0
    return null
}