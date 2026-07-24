import { describe, it, expect } from 'vitest'
import { 
    selectTargetGameweek, 
    selectClosestGameweek, 
    type GameweekWithDateRange, 
    type GameweekWithLockInfo 
} from './gameweekSelection'

const NOW = new Date('2026-08-15T12:00:00Z')

function gw(id: string, num: number, lockTime: string | null) : GameweekWithLockInfo {
    return { id, gameweekNumber: num, lockTime: lockTime ? new Date(lockTime): null }
}

describe('selectClosestGameweek', () => {
    function gw(id: string, num: number, start: string, end: string) : GameweekWithDateRange {
        return { id, gameweekNumber: num, startDate: new Date(start), endDate: new Date(end) }
    }

    const gameweeks = [
        gw('gw1', 1, '2026-08-15T12:00:00Z', '2026-08-17T18:00:00Z'),
        gw('gw2', 2, '2026-08-22T12:00:00Z', '2026-08-24T18:00:00Z'),
        gw('gw3', 1, '2026-08-29T12:00:00Z', '2026-08-31T18:00:00Z'),
    ]

    it('shows the just-finished gameweek right after it ends, before the midpoint', () => {
        const now = new Date('2026-08-18T00:00:00Z')
        expect(selectClosestGameweek(gameweeks, now)?.id).toBe('gw1')
    })

    it('switches to the upcoming gameweek once past the midpoint', () => {
        const now = new Date('2026-08-21T00:00:00Z')
        expect(selectClosestGameweek(gameweeks, now)?.id).toBe('gw2')
    })

    it('returns the last gameweek once past all midpoints', () => {
        const now = new Date('2026-09-05T00:00:00Z')
        expect(selectClosestGameweek(gameweeks, now)?.id).toBe('gw3')
    })

    it('returns null when there are no gameweeks', () => {
        expect(selectClosestGameweek([], new Date())).toBeNull()
    })

    it('returns the only gameweek when just one exists', () => {
        const single = [gw('gw1', 1, '2026-08-15T12:00:00Z', '2026-08-17T18:00:00Z')]
        expect(selectClosestGameweek(single, new Date('2026-08-20T00:00:00Z'))?.id).toBe('gw1')
    })
})

describe('selectTargetGameweek', () => {
    it('selects the first gameweek whose lock time is still in the future', () => {
        const gameweeks = [
            gw('gw1', 1, '2026-08-10T12:00:00Z'),
            gw('gw2', 2, '2026-08-17T12:00:00Z'),
            gw('gw3', 3, '2026-08-24T12:00:00Z'),
        ]

        const result = selectTargetGameweek(gameweeks, NOW)

        expect(result?.id).toBe('gw2')
    })

    it('treats a gameweek with no lock time (no fixtures found) as still open', () => {
        const gameweeks = [
            gw('gw1', 1, '2026-08-10T12:00:00Z'), // past locked
            gw('gw2', 2, null)
        ]

        const result = selectTargetGameweek(gameweeks, NOW)

        expect(result?.id).toBe('gw2')
    })

    it('returns null when every gameweek is already locked', () => {
        const gameweeks = [
            gw('gw1', 1, '2026-08-10T12:00:00Z'),
            gw('gw2', 2, '2026-08-11T12:00:00Z'),
        ]

        const result = selectTargetGameweek(gameweeks, NOW)

        expect(result).toBeNull()
    })

    it('selects the very first gameweek if it is still unlocked', () => {
        const gameweeks = [
            gw('gw1', 1, '2026-08-20T12:00:00Z'), // future
            gw('gw2', 2, '2026-08-27T12:00:00Z'),
        ]

        const result = selectTargetGameweek(gameweeks, NOW)
        
        expect(result?.id).toBe('gw1')
    })
})