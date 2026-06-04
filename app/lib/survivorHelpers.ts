export type EpisodeRef = {
    id: string
    number: number
}

const inactiveStatuses = ['eliminated', 'jury', 'medevac', 'quit', 'finalist', 'winner']

export function getContestantTribe(
    contestant: {
        status: string
        tribeMemberships: { isCurrent: boolean; episodeId: string | null; tribe: { color: string; name: string } }[]
    },
    episodes?: EpisodeRef[],
    atEpisodeNumber?: number
) {
    if (episodes && atEpisodeNumber) {
        const validMemberships = contestant.tribeMemberships
            .filter(tm => {
                if (!tm.episodeId) return true //starting tribe, always included.
                const epNum = episodes.find(e => e.id === tm.episodeId)?.number ?? 0
                return epNum <= atEpisodeNumber
            })
        return validMemberships[validMemberships.length - 1]?.tribe ?? null
    }

    if (inactiveStatuses.includes(contestant.status)) {
        // Eliminated - use last membership
        return contestant.tribeMemberships[contestant.tribeMemberships.length - 1]?.tribe ?? null
    }
    //Active - use current membership
    return contestant.tribeMemberships.find(tm => tm.isCurrent)?.tribe ?? null
}