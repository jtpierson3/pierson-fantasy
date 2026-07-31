import { describe, it, expect } from 'vitest'
import { isWithinBudget, getStartOfCurrentMonth } from './apiCallBudgetCalculation'

describe('isWithinBudget', () => {
    it('returns true when well under budget', () => {
        expect(isWithinBudget(0)).toBe(true)
        expect(isWithinBudget(1000)).toBe(true)
    })

    it('returns false once within the safety buffer of the limit', () => {
        expect(isWithinBudget(1800)).toBe(false)
        expect(isWithinBudget(1900)).toBe(false)
    })

    it('returns false once at or over the raw limit', () => {
        expect(isWithinBudget(2000)).toBe(false)
        expect(isWithinBudget(2500)).toBe(false)
    })

    it('treats the exact buffer boundary correctly', () => {
        expect(isWithinBudget(1799)).toBe(true)
        expect(isWithinBudget(1800)).toBe(false)
    })
})

describe('getStartOfCurrentMonth', () => {
    it('returns midnight on the first of the given dates month', () => {
        const result = getStartOfCurrentMonth(new Date('2026-08-15T14:30:00'))
        expect(result.getDate()).toBe(1)
        expect(result.getHours()).toBe(0)
        expect(result.getMinutes()).toBe(0)
        expect(result.getMonth()).toBe(7) // August, 0 indexed
    })
})