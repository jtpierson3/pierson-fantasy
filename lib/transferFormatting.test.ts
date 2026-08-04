import { describe, it, expect } from 'vitest'
import { transferTypeLabel, formatCurrency } from './transferFormatting'
import { TRANSFER_TYPES } from './sportmonksConstants'

describe('transferTypeLabel', () => {
    it('labels each known transfer type correctly', () => {
        expect(transferTypeLabel(TRANSFER_TYPES.LOAN_TRANSFER)).toBe('Loan')
        expect(transferTypeLabel(TRANSFER_TYPES.TRANSFER)).toBe('Transfer')
        expect(transferTypeLabel(TRANSFER_TYPES.FREE_TRANSFER)).toBe('Free Transfer')
        expect(transferTypeLabel(TRANSFER_TYPES.END_OF_LOAN)).toBe('End of Loan')
    })

    it('returns Unknown for an unrecognized or missing type', () => {
        expect(transferTypeLabel(null)).toBe('Unknown')
        expect(transferTypeLabel(99999)).toBe('Unknown')
    })
})

describe('formatCurrency', () => {
    it('formats millions with one decimal place', () => {
        expect(formatCurrency(14_700_000)).toBe('£14.7M')
        expect(formatCurrency(1_000_000)).toBe('£1.0M')
    })

    it('formats thousands with no decimal place', () => {
        expect(formatCurrency(45_000)).toBe('£45K')
        expect(formatCurrency(999_000)).toBe('£999K')
    })

    it('formats small amount as a plain number', () => {
        expect(formatCurrency(500)).toBe('£500')
        expect(formatCurrency(0)).toBe('£0')
    })

    it('returns a dash for null', () => {
        expect(formatCurrency(null)).toBe('-')
    })
})