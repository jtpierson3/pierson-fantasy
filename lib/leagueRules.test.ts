import { describe, it, expect } from 'vitest'
import { minBidFor, MIN_STARTING_BID, MIN_RAISE } from './leagueRules'

describe('minBidFor', () => {
    it('is the starting bid when there is no high bid', () => {
        expect(minBidFor(null)).toBe(MIN_STARTING_BID)
        expect(minBidFor(0)).toBe(MIN_STARTING_BID)
    })

    it('is one full raise above an exact-step high bid', () => {
        expect(minBidFor(5_000_000)).toBe(6_000_000)
    })

    it('floors an off-step high bid before adding the raise', () => {
        expect(minBidFor(5_400_000)).toBe(6_000_000)
        expect(minBidFor(5_999_999)).toBe(6_000_000)
    })

    it('uses the raise constant as its step', () => {
        expect(minBidFor(MIN_RAISE)).toBe(2 * MIN_RAISE)
    })
})