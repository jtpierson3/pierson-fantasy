import { describe, it, expect } from 'vitest'
import { planSidelinedEntries } from './sidelinedSyncPlan'

const known = new Set([10, 20])

describe('planSidelinedEntries', () => {
    it('skips entries for players we do not have', () => {
        const plan = planSidelinedEntries([{ id: 1, player_id: 99 }], known, new Set(), [])
        expect(plan).toEqual([{ action: 'skip-unknown-player' }])
    })

    it('upserts an entry we already store, even if a manual row exists', () => {
        const plan = planSidelinedEntries(
            [{ id: 1, player_id: 10 }],
            known,
            new Set([1]),
            [{ id: 'm1', playerId: 10 }]
        )
        expect(plan).toEqual([{ action: 'upsert' }])
    })

    it('upserts a new entry when there is no manual row', () => {
        const plan = planSidelinedEntries([{ id: 1, player_id: 10 }], known, new Set(), [])
        expect(plan).toEqual([{ action: 'upsert' }])
    })

    it('claims the newest manual row for each entry', () => {
        const plan = planSidelinedEntries(
            [{ id: 1, player_id: 10 }],
            known,
            new Set(),
            [{ id: 'newest', playerId: 10 }, { id: 'older', playerId: 10 }]
        )
        expect(plan).toEqual([{ action: 'claim-manual', manualRowId: 'newest' }])
    })

    it('lets each manual row be claimed only once', () => {
        const plan = planSidelinedEntries(
            [{ id: 1, player_id: 10 }, { id: 2, player_id: 10 }],
            known,
            new Set(),
            [{ id: 'm1', playerId: 10 }]
        )
        expect(plan).toEqual([
            { action: 'claim-manual', manualRowId: 'm1' },
            { action: 'upsert' },
        ])
    })

    it('does nto hand one player\'s manual row to another player', () => {
        const plan = planSidelinedEntries(
            [{ id: 1, player_id: 20 }],
            known,
            new Set(),
            [{ id: 'm1', playerId: 10 }]
        )
        expect(plan).toEqual([{ action: 'upsert' }])
    })
})