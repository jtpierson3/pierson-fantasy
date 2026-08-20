import { describe, it, expect } from 'vitest'
import { resolveAutoSubstitutions, resolveReserveUpgrades, type PlayerGameweekData, type StarterSlotAssignment } from './autoSubstitution'
import type { FormationSlot } from './formations'

function fixedSlot(position: string): FormationSlot {
  return { type: 'fixed', position } as FormationSlot
}

function flexSlot(positions: string[]): FormationSlot {
  return { type: 'flexible', positions } as FormationSlot
}

function player(
  id: string,
  points: number,
  positionPlayedId: number | null,
  didPlay: boolean,
  broadPositionPlayedId: number | null = null
): PlayerGameweekData {
  return { fantasyTeamPlayerId: id, playerId: 1, points, positionPlayedId, broadPositionPlayedId, didPlay }
}

function starterSlot(index: number, slot: FormationSlot, starter: PlayerGameweekData): StarterSlotAssignment {
  return { slotIndex: index, slot, originalStarter: starter }
}

const CB = 148
const ST = 151
const W = 156
const CM = 153
const GK_BROAD = 24

describe('resolveAutoSubstitutions (Rule 2 — bucket-based)', () => {
  it('leaves a slot unchanged when no one outscores the starter', () => {
    const starter = player('s1', 5, ST, true)
    const sub = player('sub1', 3, ST, true)
    const slots = [starterSlot(0, fixedSlot('ST'), starter)]

    const { slots: result } = resolveAutoSubstitutions(slots, [sub])

    expect(result[0].rule).toBe('NONE')
    expect(result[0].finalPlayer.fantasyTeamPlayerId).toBe('s1')
  })

  it('swaps in a sub who outscores the starter at the same real position', () => {
    const starter = player('s1', 4, ST, true)
    const sub = player('sub1', 5, ST, true)
    const slots = [starterSlot(0, fixedSlot('ST'), starter)]

    const { slots: result } = resolveAutoSubstitutions(slots, [sub])

    expect(result[0].rule).toBe('STANDARD_SUB')
    expect(result[0].finalPlayer.fantasyTeamPlayerId).toBe('sub1')
  })

  it('does not consider a sub who played a different, ineligible position', () => {
    const starter = player('s1', 2, ST, true)
    const sub = player('sub1', 10, CB, true)
    const slots = [starterSlot(0, fixedSlot('ST'), starter)]

    const { slots: result } = resolveAutoSubstitutions(slots, [sub])

    expect(result[0].rule).toBe('NONE')
  })

  it('THE DOKU CASE — a starter slotted at one position who actually played a different one is bucketed by what they really played, not their slot', () => {
    // Doku is fantasy-slotted as the team's ST, but actually played as a
    // Winger in the real match. A genuine ST sub should NOT be able to
    // "beat" him for the ST slot using his real (winger) stats — he
    // shouldn't even be competing in the ST bucket at all. Meanwhile, if
    // there's a flex W/CM slot, HE should be the one competing there
    // based on his real winger performance.
    const dokuAsStarterST = player('doku', 6, W, true) // slotted ST, played W
    const realSTSub = player('realST', 4, ST, true)
    const flexStarter = player('flexStarter', 2, CM, true)
    const wSub = player('wSub', 3, W, true)

    const slots = [
      starterSlot(0, fixedSlot('ST'), dokuAsStarterST),
      starterSlot(1, flexSlot(['W', 'CM']), flexStarter),
    ]

    const { slots: result } = resolveAutoSubstitutions(slots, [realSTSub, wSub])

    // Doku (a real W performance) should NOT stay in the ST slot competing
    // against a real ST — the ST bucket only has realSTSub as a genuine
    // ST-played candidate, so realSTSub wins the ST slot outright.
    expect(result[0].finalPlayer.fantasyTeamPlayerId).toBe('realST')

    // Doku, now bumped from the ST bucket (he was never really eligible
    // there), flows into the flex bucket since he played W. He has 6pts,
    // beating flexStarter(2) and wSub(3).
    expect(result[1].finalPlayer.fantasyTeamPlayerId).toBe('doku')
  })

  it('a flexible slot accepts a sub who played any of its allowed position types', () => {
    const starter = player('s1', 2, CM, true)
    const sub = player('sub1', 5, W, true)
    const slots = [starterSlot(0, flexSlot(['W', 'CM']), starter)]

    const { slots: result } = resolveAutoSubstitutions(slots, [sub])

    expect(result[0].finalPlayer.fantasyTeamPlayerId).toBe('sub1')
  })

  it('swaps in a sub for a starter who did not play at all', () => {
    const starter = player('s1', 0, null, false)
    const sub = player('sub1', 1, ST, true)
    const slots = [starterSlot(0, fixedSlot('ST'), starter)]

    const { slots: result } = resolveAutoSubstitutions(slots, [sub])

    expect(result[0].rule).toBe('STANDARD_SUB')
  })

  it('matches goalkeepers using the broad position id', () => {
    const starter = player('s1', 3, null, true, GK_BROAD)
    const sub = player('sub1', 6, null, true, GK_BROAD)
    const slots = [starterSlot(0, fixedSlot('GK'), starter)]

    const { slots: result } = resolveAutoSubstitutions(slots, [sub])

    expect(result[0].finalPlayer.fantasyTeamPlayerId).toBe('sub1')
  })

  it('a single player can only fill one slot, even if eligible for multiple slots needing the same position', () => {
    const starter1 = player('s1', 1, ST, true)
    const starter2 = player('s2', 1, ST, true)
    const sub = player('sub1', 5, ST, true)
    const slots = [
      starterSlot(0, fixedSlot('ST'), starter1),
      starterSlot(1, fixedSlot('ST'), starter2),
    ]

    const { slots: result } = resolveAutoSubstitutions(slots, [sub])

    const usedIds = result.filter(r => r.rule === 'STANDARD_SUB').map(r => r.finalPlayer.fantasyTeamPlayerId)
    expect(usedIds).toEqual(['sub1'])
  })

  it('cascades overflow from a fixed bucket into the flex bucket correctly', () => {
    const starterCM = player('s_cm', 3, CM, true)
    const starterFlex = player('s_flex', 3, CM, true)
    const subCM = player('sub_cm', 9, CM, true)
    const subW = player('sub_w', 10, W, true)

    const slots = [
      starterSlot(0, fixedSlot('CM'), starterCM),
      starterSlot(1, flexSlot(['W', 'CM']), starterFlex),
    ]

    const { slots: result } = resolveAutoSubstitutions(slots, [subCM, subW])

    expect(result[0].finalPlayer.fantasyTeamPlayerId).toBe('sub_cm')
    expect(result[1].finalPlayer.fantasyTeamPlayerId).toBe('sub_w')
  })

  it('the full bulk midfield scenario resolves to the correct maximum-value outcome', () => {
    const starters = [
      player('s_flex1', 3, CM, true),
      player('s_flex2', 4, W, true),
      player('s_cm1', 2, CM, true),
      player('s_cm2', 5, CM, true),
      player('s_cm3', 1, CM, true),
    ]

    const subs = [
      player('sub_w1', 8, W, true),
      player('sub_w2', 2, W, true),
      player('sub_cm1', 9, CM, true),
      player('sub_cm2', 6, CM, true),
      player('sub_cm3', 0, CM, false),
    ]

    const slots = [
      starterSlot(0, flexSlot(['W', 'CM']), starters[0]),
      starterSlot(1, flexSlot(['W', 'CM']), starters[1]),
      starterSlot(2, fixedSlot('CM'), starters[2]),
      starterSlot(3, fixedSlot('CM'), starters[3]),
      starterSlot(4, fixedSlot('CM'), starters[4]),
    ]

    const { slots: result } = resolveAutoSubstitutions(slots, subs)

    // Fixed CM bucket (3 slots): candidates are s_cm1(2), s_cm2(5), s_cm3(1),
    // sub_cm1(9), sub_cm2(6) [sub_cm3 didn't play, excluded].
    // Top 3 by score: sub_cm1(9), sub_cm2(6), s_cm2(5) win the 3 fixed slots.
    // Losers s_cm1(2) and s_cm3(1) flow to the flex bucket.
    //
    // Flex bucket (2 slots): direct candidates s_flex1(3, CM), s_flex2(4, W),
    // sub_w1(8), sub_w2(2), plus overflow s_cm1(2), s_cm3(1).
    // Top 2: sub_w1(8), s_flex2(4).
    const finalIds = result.map(r => r.finalPlayer.fantasyTeamPlayerId)

    expect(finalIds).toContain('sub_cm1')
    expect(finalIds).toContain('sub_cm2')
    expect(finalIds).toContain('s_cm2')
    expect(finalIds).toContain('sub_w1')
    expect(finalIds).toContain('s_flex2')
    expect(finalIds).not.toContain('sub_cm3') // did not play
    expect(finalIds).not.toContain('s_cm1')   // lost both buckets
    expect(finalIds).not.toContain('s_cm3')   // lost both buckets
    expect(finalIds).not.toContain('sub_w2')  // lost the flex bucket

    const usedIds = result.filter(r => r.rule === 'STANDARD_SUB').map(r => r.finalPlayer.fantasyTeamPlayerId)
    expect(new Set(usedIds).size).toBe(usedIds.length) // no double-booking
  })

  it('never assigns a replacement when the gain would be zero (exact tie)', () => {
    const starter = player('s1', 10, ST, true)
    const sub = player('sub1', 10, ST, true)
    const slots = [starterSlot(0, fixedSlot('ST'), starter)]

    const { slots: result } = resolveAutoSubstitutions(slots, [sub])

    // With bucket sort, a tie means whichever sorts first stays — starter
    // is already occupying the winning position, sub doesn't STRICTLY beat them
    expect(result[0].finalPlayer.fantasyTeamPlayerId).toBe('s1')
  })

  describe('resolveReserveUpgrades (Rule 3)', () => {
    function reservePlayer(id: string, points: number, positionPlayedId: number | null, rank: number, didPlay = true): PlayerGameweekData {
        return { fantasyTeamPlayerId: id, playerId: 1, points, positionPlayedId, broadPositionPlayedId: null, didPlay, rank }
    }

    it('returns empty when there are no empty slots', () => {
        const result = resolveReserveUpgrades([], [reservePlayer('r1', 5, ST, 1)])
        expect(result.size).toBe(0)
    })

    it('fills a single empty slot with the first eligible reserve by rank', () => {
        const slot = starterSlot(0, fixedSlot('ST'), player('s1', 0, null, false))
        const reserve1 = reservePlayer('r1', 4, ST, 1)
        const reserve2 = reservePlayer('r2', 20, ST, 2) // higher points, but lower rank priority

        const result = resolveReserveUpgrades([slot], [reserve1, reserve2])

        expect(result.get(0)?.fantasyTeamPlayerId).toBe('r1')
    })

    it('skips a reserve who is not eligible for the slot, regardless of rank', () => {
        const slot = starterSlot(0, fixedSlot('ST'), player('s1', 0, null, false))
        const reserve1 = reservePlayer('r1', 4, CB, 1) // wrong position
        const reserve2 = reservePlayer('r2', 3, ST, 2)

        const result = resolveReserveUpgrades([slot], [reserve1, reserve2])

        expect(result.get(0)?.fantasyTeamPlayerId).toBe('r2')
    })

    it('THE STRANDING CASE — fills both a fixed and flex slot correctly by processing fixed first', () => {
        const fixedCMSlot = starterSlot(0, fixedSlot('CM'), player('s_cm', 0, null, false))
        const flexSlot0 = starterSlot(1, flexSlot(['W', 'CM']), player('s_flex', 0, null, false))

        // Reserve rank 1 can ONLY play CM (narrowly eligible)
        const reserveCM = reservePlayer('r_cm', 4, CM, 1)
        // Reserve rank 2 can ONLY play W (also narrowly eligible, but for the other slot)
        const reserveW = reservePlayer('r_w', 8, W, 2)

        const result = resolveReserveUpgrades([fixedCMSlot, flexSlot0], [reserveCM, reserveW])

        // Both slots should be filled — the CM reserve MUST go to the fixed
        // CM slot (only place they're eligible), freeing the flex slot for
        // the W reserve (their only option too).
        expect(result.get(0)?.fantasyTeamPlayerId).toBe('r_cm')
        expect(result.get(1)?.fantasyTeamPlayerId).toBe('r_w')
    })

    it('a naive rank-order-only approach would strand a slot — confirms fixed-first processing prevents that', () => {
        // Same setup, but reserve ranks REVERSED (W is rank 1, CM is rank 2) —
        // if we walked reserves in rank order and let them pick ANY eligible
        // slot, the W reserve (rank 1) might grab the flex slot first (since
        // W qualifies there), stranding the CM reserve with nowhere to go
        // (the fixed CM slot needs a CM, and the only CM reserve now has no
        // flex slot left to fall back to). Processing SLOTS fixed-then-flex
        // prevents this regardless of reserve rank order.
        const fixedCMSlot = starterSlot(0, fixedSlot('CM'), player('s_cm', 0, null, false))
        const flexSlot0 = starterSlot(1, flexSlot(['W', 'CM']), player('s_flex', 0, null, false))

        const reserveW = reservePlayer('r_w', 8, W, 1)   // rank 1, W-only
        const reserveCM = reservePlayer('r_cm', 4, CM, 2) // rank 2, CM-only

        const result = resolveReserveUpgrades([fixedCMSlot, flexSlot0], [reserveW, reserveCM])

        // Fixed CM slot processed first — only reserveCM is eligible, they win it
        expect(result.get(0)?.fantasyTeamPlayerId).toBe('r_cm')
        // Flex slot processed second — reserveW is the only one left, wins it
        expect(result.get(1)?.fantasyTeamPlayerId).toBe('r_w')
    })

    it('a single reserve can only fill one slot even if eligible for multiple', () => {
        const slot1 = starterSlot(0, fixedSlot('ST'), player('s1', 0, null, false))
        const slot2 = starterSlot(1, fixedSlot('ST'), player('s2', 0, null, false))
        const reserve = reservePlayer('r1', 5, ST, 1)

        const result = resolveReserveUpgrades([slot1, slot2], [reserve])

        expect(result.size).toBe(1)
        expect([...result.values()][0].fantasyTeamPlayerId).toBe('r1')
    })

    it('leaves a slot unfilled when no reserve is eligible', () => {
        const slot = starterSlot(0, fixedSlot('GK'), player('s1', 0, null, false))
        const reserve = reservePlayer('r1', 5, ST, 1)

        const result = resolveReserveUpgrades([slot], [reserve])

        expect(result.size).toBe(0)
    })

    it('a reserve who did not play is never eligible', () => {
        const slot = starterSlot(0, fixedSlot('ST'), player('s1', 0, null, false))
        const reserve = reservePlayer('r1', 0, ST, 1, false) // didn't play

        const result = resolveReserveUpgrades([slot], [reserve])

        expect(result.size).toBe(0)
    })
  })

})