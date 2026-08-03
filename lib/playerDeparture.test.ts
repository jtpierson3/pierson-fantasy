import { describe, it, expect } from 'vitest'
import { detectDepartures, getTeamsEligibleForDepartureCheck } from './playerDeparture'

describe('detectDepartures', () => {
    it('returns empty array when the squad is unchanged', () => {
        const previous = [{ playerId: 1 }, { playerId: 2 }]
        const current = [{ playerId: 1 }, { playerId: 2 }]
        expect(detectDepartures(previous, current)).toEqual([])
    })

    it('detects a single departed player', () => {
        const previous = [{ playerId: 1 }, { playerId: 2 }]
        const current = [{ playerId: 2 }]
        expect(detectDepartures(previous, current)).toEqual([1])
    })

    it('detects multiple departed players', () => {
        const previous = [{ playerId: 1 }, { playerId: 2 }, { playerId: 3 }]
        const current = [{ playerId: 2 }]
        expect(detectDepartures(previous, current)).toEqual([1, 3])
    })

    it('does not flag a newly arrived player as departed', () => {
        const previous = [{ playerId: 1 }]
        const current = [{ playerId: 1 }, { playerId: 2 }]
        expect(detectDepartures(previous, current)).toEqual([])
    })

    it('returns empty array when the previous squad was already empty', () => {
        const previous: { playerId: number }[] = []
        const current = [{ playerId: 1 }]
        expect(detectDepartures(previous, current)).toEqual([])
    })
})

describe('getTeamsEligibleForDepartureCheck', () => {
    it('returns teams present in both the previous and current tracked sets', () => {
        const previous = [1,2,3]
        const current = [1,2,3]
        expect(getTeamsEligibleForDepartureCheck(previous, current)).toEqual([1,2,3])
    })

    it('excludes a team that fell out of tracking', () => {
        const previous = [1,2,3]
        const current = [1,2,4]
        expect(getTeamsEligibleForDepartureCheck(previous, current)).toEqual([1,2])
    })

    it('returns and empty array when no teams overlap at all', () => {
        const previous = [1,2]
        const current = [3, 4]
        expect(getTeamsEligibleForDepartureCheck(previous, current)).toEqual([])
    })

    it('does not include a newly promoted team that was not previously tracked', () => {
        const previous = [1,2]
        const current = [1,2,5]
        expect(getTeamsEligibleForDepartureCheck(previous, current)).toEqual([1,2])
    })
})