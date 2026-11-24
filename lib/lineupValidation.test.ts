import { describe, it, expect } from 'vitest'
import { validateLineupSubmission } from './lineupValidation'

const roster = Array.from({ length: 18 }, (_, i) => ({ id: `r${i}`, playerId: 100 + i }))

function lineup() {
    return roster.map((r, i) => {
        if (i < 11) return { id: r.id, playerId: r.playerId, rosterSlot: 'STARTER', slotOrder: i }
        if (i < 16) return { id: r.id, playerId: r.playerId, rosterSlot: 'SUB', slotOrder: i - 10 }
        return { id: r.id, playerId: r.playerId, rosterSlot: 'RESERVE', slotOrder: i - 15}
    })
}

describe('validateLineupSubmission', () => {
    it('accepts a well-formed lineup', () => {
        expect(validateLineupSubmission('4-3-3', lineup(), roster).valid).toBe(true)
    })

    it('rejects an unsupported formation', () => {
        expect(validateLineupSubmission('9-9-9', lineup(), roster).valid).toBe(false)
    })

    it('rejects a player not on the roster', () => {
        const l = lineup()
        l[0].playerId = 999
        expect(validateLineupSubmission('4-3-3', l, roster).valid).toBe(false)
    })

    it('rejects a roster id paired with the wrong playerId', () => {
        const l = lineup()
        l[0].playerId = l[1].playerId
        expect(validateLineupSubmission('4-3-3', l, roster).valid).toBe(false)
    })

    it('rejects duplicates / missing players', () => {
        const l = lineup()
        l[1] = { ...l[0] }
        expect(validateLineupSubmission('4-3-3', l, roster).valid).toBe(false)
        expect(validateLineupSubmission('4-3-3', l.slice(1), roster).valid).toBe(false)
    })

    it('rejects an invalid roster slot', () => {
        const l = lineup()
        l[0].rosterSlot = 'BENCH'
        expect(validateLineupSubmission('4-3-3', l, roster).valid).toBe(false)
    })

    it('rejects too many starters or duplicate/out-of-range starter slots', () => {
        const l = lineup()
        l[11] = { ...l[11], rosterSlot: 'STARTER', slotOrder: 0 }
        expect(validateLineupSubmission('4-3-3', l, roster).valid).toBe(false)

        const l2 = lineup()
        l2[0].slotOrder = 11
        expect(validateLineupSubmission('4-3-3', l2, roster).valid).toBe(false)
    })

    it('rejects non-integer or negative slotOrder', () => {
        const l = lineup()
        l[17].slotOrder = -1
        expect(validateLineupSubmission('4-3-3', l, roster).valid).toBe(false)
    })

    it('renumbers duplicate sub positions instead of rejecting', () => {
        const l = lineup()
        l[12].slotOrder = l[11].slotOrder
        const result = validateLineupSubmission('4-3-3', l, roster)
        expect(result.valid).toBe(true)
        if (!result.valid) return
        const orders = result.players
            .filter(p => p.rosterSlot === 'SUB')
            .map(p => p.slotOrder)
            .sort()
        expect(orders).toEqual([1, 2, 3, 4, 5])
    })

    it('closes gaps in sub positions', () => {
        const l = lineup()
        l[11].slotOrder = 6
        const result = validateLineupSubmission('4-3-3', l, roster)
        expect(result.valid).toBe(true)
        if(!result.valid) return
        const bySlot = Object.fromEntries(
            result.players.filter(p => p.rosterSlot === 'SUB').map(p => [p.id, p.slotOrder])
        )
        expect(bySlot[roster[11].id]).toBe(5)
    })

    it('rejects more than MAX_SUBS substitutes', () => {
        const l = lineup()
        l[16] = { ...l[16], rosterSlot: 'SUB', slotOrder: 6 }
        expect(validateLineupSubmission('4-3-3', l, roster).valid).toBe(false)
    })
})