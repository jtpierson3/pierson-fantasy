import { describe, it, expect } from 'vitest'
import { planFixtureSync } from './fixtureSyncPlan'

const terminal = new Set(['FT', 'AET'])
const teams = new Set([1, 2])

describe('planFixtureSync', () => {
    it('creates a fixture that does not exist yet', () => {
        expect(planFixtureSync({ homeId: 1, awayId: 2, existingStatus: undefined, knownTeamIds: teams, terminalStates: terminal}))
            .toEqual({ action: 'create', homeTeamId: 1, awayTeamId: 2 })
    })

    it('updates an existing fixture that is not finished', () => {
        expect(planFixtureSync({ homeId: 1, awayId: 2, existingStatus: 'NS', knownTeamIds: teams, terminalStates: terminal}))
            .toEqual({ action: 'update', homeTeamId: 1, awayTeamId: 2 })
    })

    it('skips an existing fixture in a terminal state', () => {
        expect(planFixtureSync({ homeId: 1, awayId: 2, existingStatus: 'FT', knownTeamIds: teams, terminalStates: terminal}))
            .toEqual({ action: 'skip' })
    })

    it('nulls the id of a side that is not a tracked team', () => {
        expect(planFixtureSync({ homeId: 1, awayId: 99, existingStatus: undefined, knownTeamIds: teams, terminalStates: terminal}))
            .toEqual({ action: 'create', homeTeamId: 1, awayTeamId: null })
        expect(planFixtureSync({ homeId: 98, awayId: 99, existingStatus: 'NS', knownTeamIds: teams, terminalStates: terminal}))
            .toEqual({ action: 'update', homeTeamId: null, awayTeamId: null })
    })
})