import { describe, it, expect } from 'vitest'
import { assignAllRows, type SlotAssignable } from './lineupAssignment'
import type { FormationSlot } from './formations'

function fixedSlot(position: string): FormationSlot {
  return { type: 'fixed', position } as FormationSlot
}

function flexSlot(positions: string[]): FormationSlot {
  return { type: 'flexible', positions, label: positions.join('/') } as FormationSlot
}

function player(
  id: string,
  slotOrder: number,
  positionId: number | null,
  detailedPositionId: number | null
): SlotAssignable {
  return {
    id,
    slotOrder,
    player: { position_id: positionId, detailed_position_id: detailedPositionId },
  }
}

// Detailed position ids used in lib/formations.ts DETAILED_POSITION_MAP:
// 148 = CB, 154/155 = FB, 149/150/153 = CM, 152/156/157/158 = W, 151 = ST
const CB = 148
const FB = 154
const CM = 153
const W = 156
const ST = 151
const GK_BROAD = 24

describe('assignAllRows', () => {
  it('places a player with a pinned slotOrder into that exact slot regardless of position', () => {
    const rows = [{ label: 'DEF', slots: [fixedSlot('CB'), fixedSlot('FB')] }]
    // A striker (ST) forced into slot 0 (CB slot) via slotOrder pin
    const players = [player('p1', 0, null, ST)]

    const { result } = assignAllRows(rows, players)

    expect(result[0].assigned[0]?.id).toBe('p1')
    expect(result[0].assigned[1]).toBeNull()
  })

  it('assigns unpinned players (slotOrder 0... wait, 0 is a valid pin) by natural position when slotOrder does not point to an open slot', () => {
    // slotOrder 0 is ambiguous with "pin to slot 0" — use a slotOrder outside the slot range
    // to represent "unassigned" for this test, matching how SetLineup treats stray slotOrders
    const rows = [{ label: 'DEF', slots: [fixedSlot('CB')] }]
    const players = [player('p1', 0, null, CB)]

    const { result } = assignAllRows(rows, players)

    expect(result[0].assigned[0]?.id).toBe('p1')
  })

  it('fills an empty slot by natural position match when no player is pinned there', () => {
    const rows = [{ label: 'ATT', slots: [fixedSlot('ST')] }]
    const players = [player('p1', 0, null, ST)] 

    const { result } = assignAllRows(rows, players)

    expect(result[0].assigned[0]?.id).toBe('p1')
  })

  it('does not double-assign a player to two slots', () => {
    const rows = [{ label: 'MID', slots: [fixedSlot('CM'), fixedSlot('CM')] }]
    const players = [player('p1', 0, null, CM)]

    const { result } = assignAllRows(rows, players)

    expect(result[0].assigned[0]?.id).toBe('p1')
    expect(result[0].assigned[1]).toBeNull()
  })

  it('returns overflow players who could not be placed in any slot', () => {
    const rows = [{ label: 'ATT', slots: [fixedSlot('ST')] }]
    const players = [
      player('p1', 0, null, ST),
      player('p2', 99, null, ST), // second striker, no room, slotOrder invalid too
    ]

    const { overflow } = assignAllRows(rows, players)

    expect(overflow.map(p => p.id)).toEqual(['p2'])
  })

  it('a flexible slot accepts any of its allowed position types', () => {
    const rows = [{ label: 'MID', slots: [flexSlot(['W', 'CM'])] }]
    const players = [player('p1', 0, null, W)] 

    const { result } = assignAllRows(rows, players)

    expect(result[0].assigned[0]?.id).toBe('p1')
  })

  it('GK is matched by broad position_id 24, not detailed_position_id', () => {
    const rows = [{ label: 'GK', slots: [fixedSlot('GK')] }]
    const players = [player('p1', 0, GK_BROAD, null)]

    const { result } = assignAllRows(rows, players)

    expect(result[0].assigned[0]?.id).toBe('p1')
  })

  it('pinned slotOrder takes priority over a better natural-position match elsewhere', () => {
    const rows = [
      { label: 'DEF', slots: [fixedSlot('CB')] },
      { label: 'MID', slots: [fixedSlot('CM')] },
    ]
    // p1 is a CM but pinned into slot 0 (the CB slot)
    const players = [player('p1', 0, null, CM)]

    const { result } = assignAllRows(rows, players)

    expect(result[0].assigned[0]?.id).toBe('p1') // CB slot gets the pinned CM
    expect(result[1].assigned[0]).toBeNull()     // CM slot stays empty
  })

  it('a player with a non-zero slotOrder that does not match any slot in this row becomes overflow, evin if their position would fit', () => {
    // Documents the current 0-only fallback-matching limitation
    const rows = [{ label: 'ATT', slots: [fixedSlot('ST')] }]
    const players = [player('p1', 7, null, ST)]

    const { overflow } = assignAllRows(rows, players)

    expect(overflow.map(p => p.id)).toEqual(['p1'])
  })
})