import { describe, it, expect, vi } from 'vitest'
import { computeGameweekDateRange } from './gameweekDateSync'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

const d = (iso: string) => new Date(iso)

describe('computeGameweekDateRange', () => {
    it('returns null when there are no fixtures', () => {
        expect(computeGameweekDateRange([])).toBeNull()
    })

    it('uses the same instant for start and end with a single fixture', () => {
        const range = computeGameweekDateRange([d('2026-11-21T12:30:00Z')])
        expect(range!.startDate.toISOString()).toBe('2026-11-21T12:30:00.000Z')
        expect(range!.endDate.toISOString()).toBe('2026-11-21T12:30:00.000Z')
    })

    it('returns earliest and latest kickoff across a multi-day gameweek', () => {
        const range = computeGameweekDateRange([
            d('2026-11-21T15:00:00Z'),
            d('2026-11-21T12:30:00Z'),
            d('2026-11-23T20:00:00Z'),
            d('2026-11-22T14:00:00Z'),
        ])
        expect(range!.startDate.toISOString()).toBe('2026-11-21T12:30:00.000Z')
        expect(range!.endDate.toISOString()).toBe('2026-11-23T20:00:00.000Z')
    })

    it('does not depend on input order', () => {
        const kickoffs = [
            d('2026-11-27T20:00:00Z'),
            d('2026-11-28T15:00:00Z'),
            d('2026-11-29T16:30:00Z'),
        ]
       const forward = computeGameweekDateRange(kickoffs)
       const reversed = computeGameweekDateRange([...kickoffs].reverse())
       expect(forward).toEqual(reversed)
    })

    it('handles duplicate kickoffs (simultaneous final-day matches)', () => {
        const range = computeGameweekDateRange([
            d('2026-05-24T15:00:00Z'),
            d('2026-05-24T15:00:00Z'),
            d('2026-05-24T15:00:00Z'),
        ])
        expect(range!.startDate.toISOString()).toBe('2026-05-24T15:00:00.000Z')
        expect(range!.endDate.toISOString()).toBe('2026-05-24T15:00:00.000Z')
    })

    it('does not mutate the input array', () => {
        const kickoffs = [d('2026-11-28T15:00:00Z'), d('2026-11-27T20:00:00Z')]
        const snapshot = kickoffs.map(k => k.toISOString())
        computeGameweekDateRange(kickoffs)
        expect(kickoffs.map(k => k.toISOString())).toEqual(snapshot)
    })
})
