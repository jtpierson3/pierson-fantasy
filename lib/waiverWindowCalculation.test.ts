import { describe, it, expect } from 'vitest'
import { calculateWaiverCloseTime } from './waiverWindowCalculation'
import { resumePluginState } from 'next/dist/build/build-context'

describe('calculateWaiverCloseTime', () => {
    it('closes 2 hours before a normal afternoon kickoff', () => {
        const kickoff = new Date('2026-08-22T15:00:00')
        const result = calculateWaiverCloseTime(kickoff)

        expect(result.toISOString()).toBe(new Date('2026-08-22T13:00:00').toISOString())
    })

    it('closes at 5pm the previous evening for an early morning kickoff', () => {
        const kickoff = new Date('2026-08-22T09:00:00')
        const result = calculateWaiverCloseTime(kickoff)

        expect(result.getDate()).toBe(21)
        expect(result.getHours()).toBe(17)
        expect(result.getMinutes()).toBe(0)
    })

    it('treats exactly 10am as a normal kickoff, not early', () => {
        const kickoff = new Date('2026-08-22T10:00:00')
        const result = calculateWaiverCloseTime(kickoff)

        expect(result.toISOString()).toBe(new Date('2026-08-22T08:00:00').toISOString())
    })

    it('treats 9:59 kickoff as early', () => {
        const kickoff = new Date('2026-08-22T09:59:00')
        const result = calculateWaiverCloseTime(kickoff)

        expect(result.getDate()).toBe(21)
        expect(result.getHours()).toBe(17)
    })

    it('correctly rolls back across a month boundary', () => {
        const kickoff = new Date('2026-09-01T08:00:00')
        const result = calculateWaiverCloseTime(kickoff)

        expect(result.getMonth()).toBe(7) // August (0-indexed)
        expect(result.getDate()).toBe(31)
        expect(result.getHours()).toBe(17)
    })
})