import { describe, it, expect } from 'vitest'
import { resolveSubstitutePositions } from './subPositionAssignment'

const SESKO_IN = 24818280
const TIELEMANS_OUT = 62342
const CDM = 149
const ST = 151

describe('resolveSubstitutePositions', () => {
    it('assigns the incoming sub the outgoing player positions (Sesko/Tielemans case)', () => {
        const events = [
            { type_id: 18, player_id: SESKO_IN, related_player_id: TIELEMANS_OUT }
        ]
        const positions = new Map([
            [TIELEMANS_OUT, CDM],
            [SESKO_IN, null]
        ])

        const result = resolveSubstitutePositions(events, positions)
        expect(result.get(SESKO_IN)).toBe(CDM)
    })

    it('does not override a position Sportmonks already provided for the sub', () => {
        const events = [
            { type_id: 18, player_id: SESKO_IN, related_player_id: TIELEMANS_OUT }
        ]
        const positions = new Map([
            [TIELEMANS_OUT, CDM],
            [SESKO_IN, ST]
        ])

        const result = resolveSubstitutePositions(events, positions)
        expect(result.has(SESKO_IN)).toBe(false)
    })

    it('leaves a sub of a sub unresolved when the outgoing player has no position either', () => {
        const events = [
            { type_id: 18, player_id: SESKO_IN, related_player_id: TIELEMANS_OUT }
        ]
        const positions = new Map([
            [TIELEMANS_OUT, null],
            [SESKO_IN, null]
        ])

        const result = resolveSubstitutePositions(events, positions)
        expect(result.has(SESKO_IN)).toBe(false)
    })

    it('ignores non-subsitution events', () => {
        const events = [
            { type_id: 14, player_id: SESKO_IN, related_player_id: TIELEMANS_OUT }
        ]
        const positions = new Map([
            [TIELEMANS_OUT, CDM],
            [SESKO_IN, null]
        ])

        const result = resolveSubstitutePositions(events, positions)
        expect(result.size).toBe(0)
    })

    it('handles multiple substitutions in one fixture', () => {
        const SUB2_IN = 111
        const SUB2_OUT = 222
        const events = [
            { type_id: 18, player_id: SESKO_IN, related_player_id: TIELEMANS_OUT },
            { type_id: 18, player_id: SUB2_IN, related_player_id: SUB2_OUT }
        ]
        const positions = new Map([
            [TIELEMANS_OUT, CDM],
            [SESKO_IN, null],
            [SUB2_OUT, ST],
            [SUB2_IN, null]
        ])

        const result = resolveSubstitutePositions(events, positions)
        expect(result.get(SESKO_IN)).toBe(CDM)
        expect(result.get(SUB2_IN)).toBe(ST)
    })
})