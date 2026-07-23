import { describe, it, expect } from 'vitest'
import { mergeLineupWithSnapshot } from './lineupSnapshot'

describe('mergeLineupWithSnapshot', () => {
    it('with no prior snapshot, everyone starts as unassigned reserve', () => {
        const live = [{ id: 'ftp1', playerId: 100 }, { id: 'ftp2', playerId: 200 }]
        const result = mergeLineupWithSnapshot(live, null)

        expect(result).toEqual([
            { id: 'ftp1', playerId: 100, rosterSlot: 'RESERVE', slotOrder: 0 },
            { id: 'ftp2', playerId: 200, rosterSlot: 'RESERVE', slotOrder: 0 }
        ])
    })

    it('a player in both the snapshot and live roster keep their snapshot slot', () => {
        const live = [{ id: 'ftp1', playerId: 100 }]
        const snapshot = [{ playerId: 100, rosterSlot: 'STARTER', slotOrder: 3 }]

        const result = mergeLineupWithSnapshot(live, snapshot)

        expect(result).toEqual([
            { id: 'ftp1', playerId: 100, rosterSlot: 'STARTER', slotOrder: 3 }
        ])
    })

    it('a player dropped since the last snapshot is excluded entirely', () => {
        const live = [{ id: 'ftp1', playerId: 100 }]
        const snapshot = [
            { playerId: 100, rosterSlot: 'STARTER', slotOrder: 3 },
            { playerId: 200, rosterSlot: 'SUB', slotOrder: 1}
        ]

        const result = mergeLineupWithSnapshot(live, snapshot)

        expect(result).toHaveLength(1)
        expect(result.find(p => p.playerId === 200)).toBeUndefined()
    })

    it('a newly added player not in the last snapshot defaults to unassigned reserve', () => {
        const live = [
            { id: 'ftp1', playerId: 100 },
            { id: 'ftp2', playerId: 999 }
        ]
        const snapshot = [{ playerId: 100, rosterSlot: 'STARTER', slotOrder: 3 }]

        const result = mergeLineupWithSnapshot(live, snapshot)

        expect(result.find(p => p.playerId === 999)).toEqual({
            id: 'ftp2', playerId: 999, rosterSlot: 'RESERVE', slotOrder: 0
        })
    })
})