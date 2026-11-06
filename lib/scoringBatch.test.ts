import { describe, it, expect } from 'vitest'
import { selectScoringBatch, selectPass2Fixtures } from './scoringBatch'

const ref = (id: number, gw: number | null = 1) => ({ id, gameweekNumber: gw })
const date = (s: string) => new Date(s)

describe('selectScoringBatch', () => {
    it('puts Pass 1 candidates before Pass 2 candidates', () => {
        const { jobs } = selectScoringBatch([ref(1)], [ref(2)], 10)
        expect(jobs.map(j => [j.fixtureId, j.passes])).toEqual([[1, [1]], [2, [2]]])
    })

    it('merges a fixture needing both passes into one job', () => {
        const { jobs } = selectScoringBatch([ref(1)], [ref(1), ref(2)], 10)
        expect(jobs).toHaveLength(2)
        expect(jobs[0]).toMatchObject({ fixtureId: 1, passes: [1, 2] })
    })

    it('caps the batch and reports how many were deferred', () => {
        const { jobs, deferred } = selectScoringBatch([ref(1), ref(2), ref(3)], [ref(4), ref(5)], 2)
        expect(jobs.map(j => j.fixtureId)).toEqual([1, 2])
        expect(deferred).toBe(3)
    })

    it('defers Pass 2 work before Pass 1 work when over the cap', () => {
        const { jobs } = selectScoringBatch([ref(1)], [ref(2), ref(3)], 1)
        expect(jobs.map(job => job.fixtureId)).toEqual([1])
    })

    it('handles empty input', () => {
        expect(selectScoringBatch([], [], 6)).toEqual({ jobs: [], deferred: 0 })
    })
})

describe('selectPass2Fixtures', () => {
    const cutoff = date('2026-08-10T12:00:00Z')
    const fx = (id: number, kickoff: string, done: string | null) => 
        ({ id, gameweekNumber: 1, kickoff: date(kickoff), statsPass2CompletedAt: done ? date(done) : null })

    it('returns nothing until the last kickoff of the week is past the cutoff', () => {
        const week = [fx(1, '2026-08-08T15:00:00Z', null), fx(2, '2026-08-10T19:00:00Z', null)]
        expect(selectPass2Fixtures(week, cutoff)).toEqual([])
    })

    it('returns every fixture that has not had Pass 2 once the week is eligible', () => {
        const week = [fx(1, '2026-08-08T15:00:00Z', null), fx(2, '2026-08-09T15:00:00Z', null)]
        expect(selectPass2Fixtures(week, cutoff).map(fixture => fixture.id)).toEqual([1, 2])
    })

    it('skips fixtures that already finished Pass 2 (retry after a partial failure)', () => {
        const week = [fx(1, '2026-08-08T15:00:00Z', '2026-08-10T13:00:00Z'), fx(2, '2026-08-09T15:00:00Z', null)]
        expect(selectPass2Fixtures(week, cutoff).map(fixture => fixture.id)).toEqual([2])
    })

    it('returns nothing when every fixture is done, or the week is empty', () => {
        expect(selectPass2Fixtures([fx(1, '2026-08-08T15:00:00Z', '2026-08-10T13:00:00Z')], cutoff)).toEqual([])
        expect(selectPass2Fixtures([], cutoff)).toEqual([])
    })
})
