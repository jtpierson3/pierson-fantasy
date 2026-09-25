import type { Prisma } from '@prisma/client'

type TribeWithPlayers = Prisma.SurvivorFantasyLeagueTribeGetPayload<{
    include: {
        players: {
            include: {
                contestant: {
                    include: {
                        episodeStats: { include: { event: true; episode: true } }
                    }
                }
                swappedFrom: {
                    include: {
                        episodeStats: { include: { event: true; episode: true } }
                    }
                }
            }
        }
    }
}>

/**
 * Points a fantasy tribe earned for one specific episode.
 * Mirrors the wap-aware logic in leagueDashboard.tsx's calculate Tribe Points,
 * but scoped to a single episode instead of summed across the season.
 */
export function calculateTribeEpisodePoints(
    tribe: TribeWithPlayers,
    episodeId: string,
    episodeNumber: number,
    mergeEpisodeNumber: number
): number {
    return (tribe.players ?? []).reduce((total, pick) => {
        if (pick.isSwap) {
            const newPoints = episodeNumber > mergeEpisodeNumber
                ? pick.contestant.episodeStats
                    .filter(s => s.episode.id === episodeId)
                    .reduce((sum, s) => sum + s.event.points, 0)
                : 0

            const oldPoints = episodeNumber <= mergeEpisodeNumber
                ? (pick.swappedFrom?.episodeStats ?? [])
                    .filter(s => s.episode.id === episodeId)
                    .reduce((sum, s) => sum + s.event.points, 0)
                : 0

            return total + newPoints + oldPoints
        }

        return total + pick.contestant.episodeStats
            .filter(s => s.episode.id === episodeId)
            .reduce((sum, s) => sum + s.event.points, 0)
    }, 0)
}