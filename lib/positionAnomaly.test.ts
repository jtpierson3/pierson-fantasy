import { describe, it, expect } from 'vitest'
import { checkPositionAnomaly } from './positionAnomaly'

const CDM = 149
const ST = 151
const CB = 148

describe('checkPositionAnomaly', () => {
    it('flags a player whose match position bucket differs from their stored bucket (Sesko Case)', () => {
        const result = checkPositionAnomaly(
            { position_id: null, detailed_position_id: CDM },
            ST,
            23
        )
        expect(result).toBe('unexpected-position')
    })

    it('does not flag when stored and played positions are in the same bucket', () => {
        const result = checkPositionAnomaly(
            { position_id: null, detailed_position_id: CB },
            CB,
            90
        )
        expect(result).toBeNull()
    })

    it('flags a substitute with no resolvable match position as missing position', () => {
        const result = checkPositionAnomaly(
            { position_id: null, detailed_position_id: CDM },
            null,
            23
        )
        expect(result).toBe('missing-position')
    })

    it('does not flag a bench player who did not play', () => {
        const result = checkPositionAnomaly(
            { position_id: null, detailed_position_id: CDM },
            null,
            0
        )
        expect(result).toBeNull()
    })

    it('does not false positive on the GK broad type special case', () => {
        const result = checkPositionAnomaly(
            { position_id: 24, detailed_position_id: null },
            24,
            90
        )
        expect(result).toBeNull()
    })

    it('does not flag when the stored position has no resolvable baseline', () => {
        const result = checkPositionAnomaly(
            { position_id: null, detailed_position_id: null },
            ST,
            90
        )
        expect(result).toBeNull()
    })
})