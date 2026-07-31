import { COMPETITIONS } from "@/lib/sportmonksConstants"

export function isPremierLeagueEligible(teamLeagueId: number | null | undefined): boolean {
    if (!teamLeagueId) return false
    return teamLeagueId === COMPETITIONS.premier_league.leagueId
}