import { describe, it, expect } from 'vitest'
import { calculateTribeEpisodePoints } from './survivorEpisodeScoring'

function statFor(episodeId: string, points: number) {
    return { event: { points }, episode: { id: episodeId, number: 1 } } as any
}

describe('calculateTribeEpisodePoints', () => {
    it('sums non-swap picks scoped to the target episode only', () => {
        const tribe = {
            players: [
                {
                    isSwap: false,
                    contestant: { episodeStats: [statFor('ep1', 5), statFor('ep2', 10)] },
                    swappedFrom: null,
                },
            ],
        } as any
        expect(calculateTribeEpisodePoints(tribe, 'ep1', 1, 3)).toBe(5)
    })

    it('counts the new player post-merge and the old player pre-merge for swap picks', () => {
        const tribe = {
            players: [
                {
                    isSwap: true,
                    contestant: { episodeStats: [statFor('ep4', 7)] },
                    swappedFrom: { episodeStats: [statFor('ep2', 4)] },
                },
            ],
        } as any
        expect(calculateTribeEpisodePoints(tribe, 'ep4', 4, 3)).toBe(7)
        expect(calculateTribeEpisodePoints(tribe, 'ep2', 2, 3)).toBe(4)
    })

    it ('returns 0 for a wap pick episode outside the counted range', () => {
        const tribe = {
            players: [
                {
                    isSwap: true,
                    contestant: { episodeStats: [statFor('ep2', 7)] },
                    swappedFrom: { episodeStats: [statFor('ep2', 4)] },
                }
            ]
        } as any
        expect(calculateTribeEpisodePoints(tribe, 'ep2', 2, 3)).toBe(4)
    })
})