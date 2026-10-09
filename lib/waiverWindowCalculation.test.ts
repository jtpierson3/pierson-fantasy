import { describe, it, expect } from 'vitest'
import { calculateWaiverCloseTime } from './waiverWindowCalculation'

// All inputs/outputs are explicit UTC instants so results never depend on the machine's timezone.
// Central offsets: CDT = UTC-5 (until Sun Nov 1, 2026), UTC-6 after
const close = (kickoffIso: string) => calculateWaiverCloseTime(new Date(kickoffIso)).toISOString()

describe('calculateWaiverCloseTime', () => {
    describe('normal kickoffs 9:00 AM Central or Later)', () => {
        it('closes 2 hours before a normal afternoon kickoff', () => {
            // 2PM CDT kickoff = 12 PM CDT
            expect(close('2026-10-10T19:00:00Z')).toBe('2026-10-10T17:00:00.000Z')
        })

        it('treats exactly 9 am Central as normal, not early', () => {
            // 9AM CDT = 14 Closes 7 AM = 12 same day
            expect(close('2026-10-10T14:00:00Z')).toBe('2026-10-10T12:00:00.000Z')
        })

        it('can close in the early morning when kickoff is just after 9 AM', () => {
            // 9:30 AM kickoff = 7:30 am CDT
            expect(close('2026-10-10T14:30:00Z')).toBe('2026-10-10T12:30:00.000Z')
        })
    })

    describe('early kickoffs (before 9AM Central)', () => {
        it('closes 5 PM Central the previous day for pre 9AM start time', () => {
            // 12:30 PM UK = 11:30Z = 6:30 AM CT -> Friday at 5 close
            expect(close('2026-10-10T11:30:00Z')).toBe('2026-10-09T22:00:00.000Z')
        })

        it('treats 8:59 CT as early', () => {
            // 8:59 AM CDT = 13:59Z
            expect(close('2026-10-10T13:59:00Z')).toBe('2026-10-09T22:00:00.000Z')
        })

        it('handles a kickoff at midnight central', () => {
            // 12 AM CDT Saturday = 5Z -> Friday at 5PM
            expect(close('2026-10-10T05:00:00Z')).toBe('2026-10-09T22:00:00.000Z')
        })

        it('rolls back across a month boundary', () => {
            // 9/1 7AM = 12Z -> 8/31 at 5PM CDT = 22Z
            expect(close('2026-09-01T12:00:00Z')).toBe('2026-08-31T22:00:00.000Z')
        })

        it('rolls back across a year boundary', () => {
            // 1/1/27 7 AM = 13Z => 12/31 5PM = 23Z
            expect(close('2027-01-01T13:00:00Z')).toBe('2026-12-31T23:00:00.000Z')
        })
    })

    describe('Central date vs UTF date', () => {
        it('uses the central calendar day, not the UTC day', () => {
            // 11:30 Z is already 10/10 in both time zones, but 3 on 10/10 is still 10/9 in Central.
            // 03:00Z = 10 PM CDT 10/9 -> normal kickoff, closes 8PM on 10/9 = 1Z
            expect(close('2026-10-10T03:00:00Z')).toBe('2026-10-10T01:00:00.000Z')
        })
    })

    describe('daylight saving transitions', () => {
        it('uses CDT before fall back (10 31 5PM = 22Z', () => {
            expect(close('2026-11-01T12:00:00Z')).toBe('2026-10-31T22:00:00.000Z')
        })

        it('uses CST after fallback', () => {
            expect(close('2026-11-02T14:59:00Z')).toBe('2026-11-01T23:00:00.000Z')
        })

        it('treats 9AM CST as normal after fall back', () => {
            expect(close('2026-11-02T15:00:00Z')).toBe('2026-11-02T13:00:00.000Z')
        })

        it('uses CST for the previous day across spring forward', () => {
            // 2PM CDT kickoff = 12 PM CDT
            expect(close('2026-03-08T13:00:00Z')).toBe('2026-03-07T23:00:00.000Z')
        })
    })

    it('does not mutate input date', () => {
        const kickoff = new Date('2026-10-10T11:30:00.000Z')
        calculateWaiverCloseTime(kickoff)
        expect(kickoff.toISOString()).toBe('2026-10-10T11:30:00.000Z')
    })
})
    
