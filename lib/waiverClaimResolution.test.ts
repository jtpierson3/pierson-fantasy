import { describe, it, expect } from 'vitest'
import {
    resolveWaiverClaims,
    type WaiverClaimInput,
    type WaiverTeamInput,
} from './waiverClaimResolution'

function team(id: string, waiverPriority: number, roster: number[] = []) : WaiverTeamInput {
    return { id, waiverPriority, rosterPlayerIds: roster, rosterSize: roster.length }
}

function claim(
    id: string, 
    fantasyTeamId: string, 
    playerToAddId: number,
    opts: { drop?: number; rank?: number } = {}
): WaiverClaimInput{
    return {
        id,
        fantasyTeamId,
        playerToAddId,
        playerToDropId: opts.drop ?? null,
        rank: opts.rank ?? 1,
    }
}

const statusOf = (r: ReturnType<typeof resolveWaiverClaims>, claimId: string) =>
    r.claimResults.find(c => c.claimId === claimId)?.status

describe('resolveWaiverClaims', () => {
    it('lower waiverPriority wins a contested player; other claim is lost', () => {
        const res = resolveWaiverClaims(
            [claim('c1', 'A', 100), claim('c2', 'B', 100)],
            [team('A', 1), team('B', 4)]
        )

        expect(statusOf(res, 'c1')).toBe('won')
        expect(statusOf(res, 'c2')).toBe('lost')
        expect(res.finalTeamState['A'].rosterPlayerIds).toContain(100)
    })

    it('winner rolls to back of the line (max-Priority + 1)', () => {
        const res = resolveWaiverClaims(
            [claim('c1', 'A', 100)],
            [team('A', 1), team('B', 4), team('C', 7)]
        )

        expect(res.finalTeamState['A'].waiverPriority).toBe(8)
        expect(res.finalTeamState['B'].waiverPriority).toBe(4)
    })

    it('is deterministic when two teams share a priority (tie-break guard)', () => {
        const claims = [claim('c1', 'A', 100), claim('c2', 'B', 100)]
        const teams = [team('A', 5), team('B', 5)]

        const forward = resolveWaiverClaims(claims,teams)
        const reversed = resolveWaiverClaims([...claims].reverse(), [...teams].reverse())

        expect(statusOf(forward, 'c1')).toBe('won')
        expect(statusOf(forward, 'c2')).toBe('lost')
        expect(statusOf(reversed, 'c1')).toBe('won')
        expect(statusOf(reversed, 'c2')).toBe('lost')
    })

    it('a team that wins its first claim drops behind the others for its second', () => {
        const res = resolveWaiverClaims(
            [
                claim('a1', 'A', 100, { rank: 1 }),
                claim('a2', 'A', 200, { rank: 2 }),
                claim('b1', 'B', 200, { rank: 1 }),
            ],
            [team('A', 1), team('B', 4), team('C', 7)]
        )

        expect(statusOf(res, 'a1')).toBe('won')
        expect(statusOf(res, 'b1')).toBe('won')
        expect(statusOf(res, 'a2')).toBe('lost')
    })
})