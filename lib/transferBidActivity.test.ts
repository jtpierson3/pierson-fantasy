import { describe, it, expect } from 'vitest'
import { leadingBidsByPlayer } from './transferBidActivity'

const standings = [
    { id: 'A', rank: 1 },
    { id: 'B', rank: 2 },
    { id: 'C', rank: 3 },
]

describe('leadingBidsByPlayer', () => {
    it('picks the highest bid per player', () => {
        const bids = [
            { id: 'b1', fantasyTeamId: 'A', playerId: 10, amount: 2_000_000 },
            { id: 'b2', fantasyTeamId: 'B', playerId: 10, amount: 5_000_000 },
        ]
        const out = leadingBidsByPlayer(bids, standings)
        expect(out.get(10)?.bid.id).toBe('b2')
        expect(out.get(10)?.competingBids).toBe(2)
    })

    it('breaks amount ties toward the worse league standing', () => {
        const bids = [
            { id: 'b1', fantasyTeamId: 'A', playerId: 10, amount: 3_000_000 },
            { id: 'b2', fantasyTeamId: 'C', playerId: 10, amount: 3_000_000 },
        ]
        expect(leadingBidsByPlayer(bids, standings).get(10)?.bid.id).toBe('b2')
    })

    it('keeps players independent', () => {
        const bids = [
            { id: 'b1', fantasyTeamId: 'A', playerId: 10, amount: 1_000_000 },
            { id: 'b2', fantasyTeamId: 'B', playerId: 20, amount: 4_000_000 },
        ]
        const out = leadingBidsByPlayer(bids, standings)
        expect(out.get(10)?.bid.id).toBe('b1')
        expect(out.get(20)?.bid.id).toBe('b2')
    })

    it('treats an unranked team as worst possible (always wins a tie)', () => {
        const bids = [
            { id: 'b1', fantasyTeamId: 'A', playerId: 10, amount: 3_000_000 },
            { id: 'b2', fantasyTeamId: 'Z', playerId: 10, amount: 3_000_000 },
        ]
        expect(leadingBidsByPlayer(bids, standings).get(10)?.bid.id).toBe('b2')
    })

    it('returns an empty map for no bids', () => {
        expect(leadingBidsByPlayer([], standings).size).toBe(0)
    })
})