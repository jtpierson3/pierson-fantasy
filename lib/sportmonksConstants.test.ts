import { describe, it, expect } from 'vitest'
import {
    resolveCupGameweek,
    TERMINAL_FIXTURE_STATES,
    mapFixtureStatus,
    LEAGUE_CUP_ROUND_TO_GAMEWEEK,
    DOMESTIC_CUP_ROUND_TO_GAMEWEEK,
} from './sportmonksConstants'

describe('resolveCupGameweek - name normalization', () => {
    it('matches an exact map key', () => {
        const r = resolveCupGameweek('carabao_cup', 'Round 3')
        expect(r.gameweekNumber).toBe(LEAGUE_CUP_ROUND_TO_GAMEWEEK['Round 3'])
        expect(r.needsAttention).toBe(false)
        expect(r.reason).toBeNull()
    })

    it('matches Sportmonks ordinal form against our Round N key', () => {
        const r = resolveCupGameweek('carabao_cup', '2nd Round')
        expect(r.gameweekNumber).toBe(LEAGUE_CUP_ROUND_TO_GAMEWEEK['Round 2'])
    })

    it('matches across a hyphen / spacing mismatch', () => {
        const r = resolveCupGameweek('carabao_cup', 'Quarter-finals')
        expect(r.gameweekNumber).toBe(LEAGUE_CUP_ROUND_TO_GAMEWEEK['Quarterfinals'])
    })

    it('matches the FA Cup "5th Round" form', () => {
        const r = resolveCupGameweek('fa_cup', '5th Round')
        expect(r.gameweekNumber).toBe(LEAGUE_CUP_ROUND_TO_GAMEWEEK['5th Round'])
    })

    it('maps the final', () => {
        const r = resolveCupGameweek('fa_cup', 'Final')
        expect(r.gameweekNumber).toBe(LEAGUE_CUP_ROUND_TO_GAMEWEEK['Final'])
    })
})

describe('resolveCupGameweek - non matches', () => {
    it('treats an early qualifying round as intentionally unmapped (quiet)', () => {
        const r = resolveCupGameweek('carabao_cup', 'Preliminary Round')
        expect(r.gameweekNumber).toBeNull()
        expect(r.needsAttention).toBe(false)
        expect(r.reason).toContain('intentionally not mapped')
    })

    it('treats FA Cup 1st round as intentionally unmapped', () => {
        const r = resolveCupGameweek('fa_cup', '1st Round')
        expect(r.gameweekNumber).toBeNull()
        expect(r.needsAttention).toBe(false)
    })

    it('flags an unrecognized round for attention and name the map + how to fix', () => {
        const r = resolveCupGameweek('carabao_cup', 'Round of 16')
        expect(r.gameweekNumber).toBeNull()
        expect(r.needsAttention).toBe(true)
        expect(r.reason).toContain('LEAGUE_CUP_ROUND_TO_GAMEWEEK')
        expect(r.reason).toContain('Round of 16')
    })

    it('handles a missing stage name without throwing', () => {
        const r = resolveCupGameweek('fa_cup', null)
        expect(r.gameweekNumber).toBeNull()
        expect(r.reason).toContain('no round/stage')
    })
})

describe('TERMINAL_FIXTURE_STATES', () => {
    it('contains only finished-match codes', () => {
        expect([...TERMINAL_FIXTURE_STATES].sort()).toEqual(['AET', 'AWD', 'FT', 'FTP', 'WO'])
    })

    it('every terminal code is a real mapFixtureStatus output', () => {
        const allCodes = new Set(
            Array.from({ length: 30 }, (_, i) => mapFixtureStatus(i)).filter(c => c !== 'UNKNOWN')
        )
        for (const code of TERMINAL_FIXTURE_STATES) {
            expect(allCodes.has(code)).toBe(true)
        }
    })

    it('does not include in progress states', () => {
        expect(TERMINAL_FIXTURE_STATES.has('NS')).toBe(false)
        expect(TERMINAL_FIXTURE_STATES.has('HT')).toBe(false)
        expect(TERMINAL_FIXTURE_STATES.has(mapFixtureStatus(2))).toBe(false)
    })
})