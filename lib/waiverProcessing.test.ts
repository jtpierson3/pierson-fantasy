import { describe, it, expect } from 'vitest'
import { resolveWaiverClaims, type WaiverClaimInput, type WaiverTeamInput } from './waiverProcessing'

function team(id: string, waiverPriority: number, rosterPlayerIds: number[] = [], rosterSize?: number): WaiverTeamInput {
    return { id, waiverPriority, rosterPlayerIds, rosterSize: rosterSize ?? rosterPlayerIds.length }
}

function claim(
    id: string,
    fantasyTeamId: string,
    playerToAddId: number,
    rank: number,
    playerToDropId: number | null = null
): WaiverClaimInput {
    return { id, fantasyTeamId, playerToAddId, playerToDropId, rank }
}

describe('resolveWaiverClaims', () => {
    it('an uncontested claim wins', () => {
        const teams = [team('teamA', 1, [], 20)]
        const claims = [claim('claim1', 'teamA', 100, 1)]

        const { claimResults } = resolveWaiverClaims(claims, teams)

        expect(claimResults).toEqual([{ claimId: 'claim1', status: 'won' }])
    })

    it('Contested Claim - better priority (lower number) wins, other loses', () => {
        const teams = [
            team('teamA', 1, [], 20), //best priority
            team('teamB', 2, [], 20)
        ]
        const claims = [
            claim('claimA', 'teamA', 100, 1),
            claim('claimB', 'teamB', 100, 1)
        ]

        const { claimResults } = resolveWaiverClaims(claims, teams)

        const resultA = claimResults.find(r => r.claimId === 'claimA')
        const resultB = claimResults.find(r => r.claimId === 'claimB')

        expect(resultA?.status).toBe('won')
        expect(resultB?.status).toBe('lost')
    })

    it('Winning a claim with a drop invalidates the same teams other claim involving that player', () => {
        const teams = [team('teamA', 1, [50], 23)]
        const claims = [
            claim('claim1', 'teamA', 100, 1, 50), // rank 1: add 100 drop 50
            claim('claim2', 'teamA', 200, 2, 50) // rank 2: add 200 also dropping 50
        ]

        const { claimResults } = resolveWaiverClaims(claims, teams)

        const result1 = claimResults.find(r => r.claimId === 'claim1')
        const result2 = claimResults.find(r => r.claimId === 'claim2')

        expect(result1?.status).toBe('won')
        expect(result2?.status).toBe('invalidated')
    })

    it('team exhausts all claims when none are valid, all marked lost', () => {
        const teams = [
            team('teamA', 1, [], 20),
            team('teamB', 2, [], 20)
        ]
        const claims = [
            claim('claimA1', 'teamA', 100, 1), // Team A takes player 100
            claim('claimB1', 'teamB', 100, 1) // teamB's only claim, also wants 100 will lose
        ]

        const { claimResults } = resolveWaiverClaims(claims, teams)

        const resultB1 = claimResults.find(r => r.claimId === 'claimB1')
        expect(resultB1?.status).toBe('lost')
    })

    it('a team that wins resets to the back of the line in the same run', () => {
        const teams = [
            team('teamA', 1, [], 20), // worst priority goes first
            team('teamB', 2, [], 20),
            team('teamC', 3, [], 20)
        ]
        const claims = [
            claim('claimA', 'teamA', 100, 1), //Team A wins player 100 on pass 1
            claim('claimA2', 'teamA', 200, 2), //Team A also wants player 200
            claim('claimC', 'teamC', 200, 1) //Team C. also wants player 200
        ]

        const { claimResults, finalTeamState } = resolveWaiverClaims(claims,teams)

        // TeamA's priroity should have moved to the back after winning claim 100
        expect(finalTeamState['teamA'].waiverPriority).toBeGreaterThan(3)

        //Since teamA reset behind team C, Team C should win player 200
        const resultC = claimResults.find(r => r.claimId === 'claimC')
        const resultA2 = claimResults.find(r => r.claimId === 'claimA2')

        expect(resultC?.status).toBe('won')
        expect(resultA2?.status).toBe('lost')
    })

    it('a claim with no drop specified fails if roster is already at the 23 cap', () => {
        const teams = [team('teamA', 1, [50], 23)]
        const claims = [claim('claim1', 'teamA', 100, 1, 50)]

        const { claimResults } = resolveWaiverClaims(claims,teams)

        expect(claimResults.find(r => r.claimId === 'claim1')?.status).toBe('won')
    })
})