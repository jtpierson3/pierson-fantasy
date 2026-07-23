import { describe, it, expect } from 'vitest'
import { selectTargetGameweek, type GameweekWithLockInfo } from './gameweekSelection'

const NOW = new Date('2026-08-15T12:00:00Z')

function gw(id: string, num: number, lockTime: string | null) : GameweekWithLockInfo {
    return { id, gameweekNumber: num, lockTime: lockTime ? new Date(lockTime): null }
}

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