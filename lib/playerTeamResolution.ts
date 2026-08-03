export type SportmonksTeamStint = {
    team_id: number
    start: string | null
    end: string | null
    team: {
        id: number
        name: string
        image_path: string | null
        type: 'domestic' | 'national'
    } | null
}

export type ResolvedTeam = SportmonksTeamStint['team']

/**
 * Given a player's team history from Sportmonks, determines their current club.
 * 
 * Logic
 * 1. Only consider domestic club stints, don't care about international
 * 2. IF exactly one domestic club exists, use it
 * 3. if multiple exist, prefere the one still active (start date > start date / end date > end date)
 * 4. If there are no teams at all the player has no current club
 */
export function getCurrentClub(teams: SportmonksTeamStint[], now: Date = new Date()): ResolvedTeam | null {
    const domesticStints = teams.filter(t => t.team && t.team.type === 'domestic')
    if (domesticStints.length === 0) return null

    const sorted = [...domesticStints].sort((a, b) => {
        const aStart = a.start ? new Date(a.start).getTime() : 0
        const bStart = b.start ? new Date(b.start).getTime(): 0
        return bStart - aStart
    })
    
    const mostRecent = sorted[0]
    if (mostRecent.end && new Date(mostRecent.end) < now) return null

    return mostRecent.team
}