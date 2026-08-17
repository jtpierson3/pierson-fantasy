import { describe, it, expect } from 'vitest'
import { groupCallsForRollup, getRollupCutoffDate, type RawCallForRollup } from './apiUsageRollup'

function log(id: string, source: string, date: string): RawCallForRollup {
    return { id, source, calledAt: new Date(date) }
}

describe('groupCallsForRollup', () => {
    it('groups calls by year, month, and source', () => {
        const logs = [
            log('l1', 'SYNC_PLAYERS', '2026-05-10T00:00:00Z'),
            log('l2', 'SYNC_PLAYERS', '2026-05-15T00:00:00Z'),
            log('l3', 'SYNC_TEAMS', '2026-05-10T00:00:00Z'),
        ]

        const groups = groupCallsForRollup(logs)

        expect(groups).toHaveLength(2)
        const playersGroup = groups.find(g => g.source === 'SYNC_PLAYERS')
        expect(playersGroup?.totalCalls).toBe(2)
        expect(playersGroup?.logIds).toEqual(['l1', 'l2'])
    })

    it('keeps different months separate for the same source', () => {
        const logs = [
            log('l1', 'SYNC_PLAYERS', '2026-04-10T00:00:00Z'),
            log('l2', 'SYNC_PLAYERS', '2026-05-15T00:00:00Z'),
        ]

        const groups = groupCallsForRollup(logs)

        expect(groups).toHaveLength(2)
        expect(groups.every(g => g.totalCalls === 1)).toBe(true)
    })

    it('returns an empty array for no logs', () => {
        expect(groupCallsForRollup([])).toEqual([])
    })

    it('correctly counts a larget batch across multiple sources and months', () => {
        const logs = [
            log('l1', 'SYNC_PLAYERS', '2026-05-01T00:00:00Z'),
            log('l2', 'SYNC_PLAYERS', '2026-05-02T00:00:00Z'),
            log('l3', 'SYNC_PLAYERS', '2026-05-03T00:00:00Z'),
            log('l4', 'SYNC_TEAMS', '2026-05-01T00:00:00Z'),
            log('l3', 'PLAYER_SEARCH', '2026-06-01T00:00:00Z'),
        ]

        const groups = groupCallsForRollup(logs)

        expect(groups).toHaveLength(3)
        expect(groups.find(g => g.source === 'SYNC_PLAYERS')?.totalCalls).toBe(3)
        expect(groups.find(g => g.source === 'SYNC_TEAMS')?.totalCalls).toBe(1)
        expect(groups.find(g => g.source === 'PLAYER_SEARCH')?.totalCalls).toBe(1)
    })
})

describe('getRollupCutoffDate', () => {
    it('defaults to 3 months before now', () => {
        const now = new Date('2026-08-15T00:00:00Z')
        const cutoff = getRollupCutoffDate(now)

        expect(cutoff.getMonth()).toBe(4) // May - 0 indexed
        expect(cutoff.getFullYear()).toBe(2026)
    })

    it('defaults to 3 months before now', () => {
        const now = new Date('2026-08-15T00:00:00Z')
        const cutoff = getRollupCutoffDate(now, 1)

        expect(cutoff.getMonth()).toBe(6) // July, 0-indexed
    })
})