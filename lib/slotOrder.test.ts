import { describe, it, expect } from 'vitest'
import { nextOpenOrder } from './slotOrder'

describe('nextOpenOrder', () => {
    it('returns 1 for an empty list', () => {
        expect(nextOpenOrder([], 5)).toBe(1)
    })

    it('returns max + 1 when every position is taken', () => {
        expect(nextOpenOrder([1, 2, 3, 4, 5], 5)).toBe(6)
    })

    it('refills a gap instead of using length + 1 (the Harry Wilson case)', () => {
        expect(nextOpenOrder([1, 3, 4, 5], 5)).toBe(2)
    })

    it('fills a gap at the front', () => {
        expect(nextOpenOrder([2, 3], 5)).toBe(1)
    })

    it('ignores duplicates and out-of-range values', () => {
        expect(nextOpenOrder([1, 1, 0, 9, -3], 5)).toBe(2)
    })
})