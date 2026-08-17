export function qualifiesForCleanSheet(
    teamGoalsConceded: number,
    playerMinutesPlayed: number
): boolean {
    if (teamGoalsConceded > 0) return false
    return playerMinutesPlayed >= 60
}