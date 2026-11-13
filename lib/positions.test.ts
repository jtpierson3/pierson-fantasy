import { describe, it, expect } from 'vitest'
import {
    POSITION_ID,
    GOALKEEPER_POSITION_ID,
    toBroadPositionId,
    getPositionShort,
    getPositionLabel,
    getPositionColor,
} from '@/lib/positions'

describe('broadPositionId', () => {
    it('returns 24 only for the broad goalkeeper id', () => {
        expect(toBroadPositionId(24)).toBe(24)
        expect(toBroadPositionId(GOALKEEPER_POSITION_ID)).toBe(24)
    })

    it('returns null for anything else, including detailed and missing ids', () => {
        expect(toBroadPositionId(148)).toBeNull()
        expect(toBroadPositionId(25)).toBeNull()
        expect(toBroadPositionId(null)).toBeNull()
        expect(toBroadPositionId(undefined)).toBeNull()
    })
})

describe('position labels', () => {
    it('uses ATT as the short label for attackers', () => {
        expect(getPositionShort(POSITION_ID.ATT)).toBe('ATT')
        expect(getPositionShort(POSITION_ID.GK)).toBe('GK')
    })

    it('falls back to N/A/ for unknown or missing ids', () => {
        expect(getPositionShort(28)).toBe('N/A')
        expect(getPositionShort(null)).toBe('N/A')
        expect(getPositionShort(undefined)).toBe('N/A')
    })

    it('has full names and falls back to unknown', () => {
        expect(getPositionLabel(POSITION_ID.DEF)).toBe('Defender')
        expect(getPositionLabel(null)).toBe('Unknown')
    })

    it('gives each broad position its own color and a neutral fallback', () => {
        const colors = [POSITION_ID.GK, POSITION_ID.DEF, POSITION_ID.MID, POSITION_ID.ATT].map(getPositionColor)
        expect(new Set(colors).size).toBe(4)
        expect(getPositionColor(999)).toBe('bg-gray-100 text-gray-500')
    })
})