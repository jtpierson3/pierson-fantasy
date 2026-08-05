import { describe, it, expect } from 'vitest'
import { validateBidAmount } from './transferBidValuation'

describe('validateBidAmount', () => {
    it('rejects a bid exceeding available funds', () => {
        const result = validateBidAmount(10_000_000, null, 5_000_000)
        expect(result.valid).toBe(false)
    })

    it('rejects a starting bid below the 1M minimum', () => {
        const result = validateBidAmount(500_000, null, 5_000_000)
        expect(result.valid).toBe(false)
    })

    it('accepts a valid starting bid', () => {
        const result = validateBidAmount(1_000_000, null, 5_000_000)
        expect(result.valid).toBe(true)
    })

    it('rejects a raise that does not beat the current high bid', () => {
        const result = validateBidAmount(4_000_000, 5_000_000, 5_000_000)
        expect(result.valid).toBe(false)
    })

    it('requires at least a 1M raise, rounding up from a flooded odd current high', () => {
        const tooLow = validateBidAmount(7_600_000, 7_500_000, 10_000_000)
        expect(tooLow.valid).toBe(false)

        const justRight = validateBidAmount(8_000_000, 7_500_000, 10_000_000)
        expect(justRight.valid).toBe(true)
    })

    it('allows an all-in bid even if it does not satifsy the clean 1M raise rule', () => {
        const result = validateBidAmount(7_600_000, 7_000_000, 7_600_000)
        expect(result.valid).toBe(true)
    })

    it('rejects a non-all-in raise of less than 1M over a round current high', () => {
        const result = validateBidAmount(7_500_000, 7_000_000, 10_000_000)
        expect(result.valid).toBe(false)
    })

    it('accepts a clean 1M raise over a round current high', () => {
        const result = validateBidAmount(8_000_000, 7_000_000, 10_000_000)
        expect(result.valid).toBe(true)
    })

    it('allows matching the current high bid exactly, resolved by standings tiebreaker', () => {
        const result = validateBidAmount(5_000_000, 5_000_000, 10_000_000)
        expect(result.valid).toBe(true)
    })
})