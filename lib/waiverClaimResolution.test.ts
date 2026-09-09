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

const fullRoster = () => Array.from({ length: 23 }, (_, i) => i + 1)

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

    it('drop target is still on the roster: claim swaps the player out', () => {
        const res = resolveWaiverClaims(
            [claim('c1', 'A', 100, { drop: 2 })],
            [team('A', 1, [1, 2, 3])]
        )

        expect(statusOf(res, 'c1')).toBe('won')
        expect(res.finalTeamState['A'].rosterPlayerIds).toContain(100)
        expect(res.finalTeamState['A'].rosterPlayerIds).not.toContain(2)
        expect(res.finalTeamState['A'].rosterPlayerIds).toHaveLength(3)
    })

    it('drop target already gone but roster has room: claim still adds the player', () => {
        const res = resolveWaiverClaims(
            [claim('c1', 'A', 100, { drop: 99 })],
            [team('A', 1, [1, 2, 3])]
        )

        expect(statusOf(res, 'c1')).toBe('won')
        expect(res.finalTeamState['A'].rosterPlayerIds).toContain(100)
        expect(res.finalTeamState['A'].rosterPlayerIds).toHaveLength(4)
    })

    it('drop target already gone and roster full: claim is lost', () => {
        const res = resolveWaiverClaims(
            [claim('c1', 'A', 100, { drop: 99 })],
            [team('A', 1, fullRoster())]
        )

        expect(statusOf(res, 'c1')).toBe('lost')
        expect(res.finalTeamState['A'].rosterPlayerIds).not.toContain(100)
        expect(res.finalTeamState['A'].rosterPlayerIds).toHaveLength(23)
    })

    it('no-drop claim on a full roster is lost', () => {
        const res = resolveWaiverClaims(
            [claim('c1', 'A', 100)],
            [team('A', 1, fullRoster())]
        )

        expect(statusOf(res, 'c1')).toBe('lost')
        expect(res.finalTeamState['A'].rosterPlayerIds).toHaveLength(23)
    })

    it('no-drop claims only fill open slots; the rest are lost once full', () => {
        const roster = Array.from({ length: 22 }, (_, i) => i + 1)
        const res = resolveWaiverClaims(
            [
                claim('c1', 'A', 100, { rank: 1 }),
                claim('c2', 'A', 101, { rank: 2 }),
                claim('c3', 'A', 102, { rank: 3 }),
            ],
            [team('A', 1, roster)]
        )

        expect(statusOf(res, 'c1')).toBe('won')
        expect(statusOf(res, 'c2')).toBe('lost')
        expect(statusOf(res, 'c3')).toBe('lost')
        expect(res.finalTeamState['A'].rosterPlayerIds).toContain(100)
        expect(res.finalTeamState['A'].rosterPlayerIds).toHaveLength(23)
    })

    it('one open slot: a no-drop claim takes it, a later claim with a valid drop still swaps', () => {
        const roster = Array.from({ length: 22 }, (_, i) => i + 1)
        const res = resolveWaiverClaims(
            [
                claim('c1', 'A', 100, { rank: 1 }),
                claim('c2', 'A', 101, { rank: 2, drop: 10 })
            ],
            [team('A', 1, roster)]
        )

        expect(statusOf(res, 'c1')).toBe('won')
        expect(statusOf(res, 'c2')).toBe('won')

        const final = res.finalTeamState['A'].rosterPlayerIds
        expect(final).toEqual(expect.arrayContaining([100, 101]))
        expect(final).not.toContain(10)
        expect(final).toHaveLength(23)
    })

    it('a claim that succeeds via open slot does not invalidate a sibling referencing its stale drop target', () => {
        const res = resolveWaiverClaims(
            [
                claim('c1', 'A', 100, { rank: 1, drop: 99 }),
                claim('c2', 'A', 99, { rank: 2 })
            ],
            [team('A', 1, [1, 2, 3])]
        )

        expect(statusOf(res, 'c1')).toBe('won')
        expect(statusOf(res, 'c2')).toBe('won')
        expect(res.finalTeamState['A'].rosterPlayerIds).toEqual(expect.arrayContaining([100, 99]))
    })
})