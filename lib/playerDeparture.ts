export type SquadMember = {
    playerId: number
}

/**
 * Given the players who were on a team's squad BEFORE this sync, and the player actually returned
 * by this sync run, determines who has left. A departed player is anyone previously on the squad but 
 * missing from the fresh sync result.
 */
export function detectDepartures(
    previousSquad: SquadMember[],
    currentSquad: SquadMember[]
): number[] {
    const currentIds = new Set(currentSquad.map(p => p.playerId))
    return previousSquad
        .filter(p => !currentIds.has(p.playerId))
        .map(p => p.playerId)
}

export type TrackedTeam = {
    id: number
}

/**
 * Returns only the team Ids that are safe to run departure detection for -
 * teams present in both the previous and current tracked sets. A team that fell out of tracking (relegated)
 * is excluded, since we can't distinguish player transfered out from team is not tracked anymore using 
 * squad-list comparison alone
 */
export function getTeamsEligibleForDepartureCheck(
    previouslyTrackedTeamIds: number[],
    currentlyTrackedTeamIds: number[]
): number[] {
    const currentSet = new Set(currentlyTrackedTeamIds)
    return previouslyTrackedTeamIds.filter(id => currentSet.has(id))
}