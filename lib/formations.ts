// Position type keys used in formation system
export type PositionType = 'GK' | 'CB' | 'FB' | 'CM' | 'W' | 'ST'

// A fixed slot must be filled by a specific position type
export type FixedSlot = {
    type: 'fixed'
    position: PositionType
}

// A flexible slot can be filled by one of multiple position types
export type FlexibleSlot = {
    type: 'flexible'
    positions: PositionType[]
    label: string // e.g. "W/CM" or "W/FB"
}

export type FormationSlot = FixedSlot | FlexibleSlot

export type FormationDefinition = {
    name: string
    slots: FormationSlot[]
}

// Helper to generate fixed slots
function fixed(position: PositionType, count: number): FixedSlot[] {
    return Array.from({ length: count }, () => ({ type: 'fixed' as const, position}))
}

// Helper to generate flexible slots
function flex(positions: PositionType[], count: number): FlexibleSlot[] {
    return Array.from({ length: count }, () => ({
        type: 'flexible' as const,
        positions,
        label: positions.join('/')
    }))
}

export const FORMATION_DEFINITIONS: Record<string, FormationDefinition> = {
    '4-2-3-1': {
        name: '4-2-3-1',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 2),
            ...fixed('FB', 2),
            ...fixed('CM', 3),
            ...flex(['W', 'CM'], 2),
            ...fixed('ST', 1),
        ]
    },

    '4-3-3': {
        name: '4-3-3',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 2),
            ...fixed('FB', 2),
            ...fixed('CM', 3),
            ...fixed('W', 2),
            ...fixed('ST', 1),
        ]
    },

    '4-2-1-3': {
        name: '4-2-1-3',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 2),
            ...fixed('FB', 2),
            ...fixed('CM', 3),
            ...fixed('W', 2),
            ...fixed('ST', 1),
        ]
    },

    '4-4-2': {
        name: '4-4-2',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 2),
            ...fixed('FB', 2),
            ...fixed('CM', 2),
            ...fixed('W', 2),
            ...fixed('ST', 2),
        ]
    },

    '4-2-4': {
        name: '4-2-4',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 2),
            ...fixed('FB', 2),
            ...fixed('CM', 2),
            ...fixed('W', 2),
            ...fixed('ST', 2),
        ]
    },

    '3-5-2': {
        name: '3-5-2',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 3),
            ...fixed('CM', 3),
            ...flex(['W', 'FB'], 2),
            ...fixed('ST', 2),
        ]
    },

    '3-4-1-2': {
        name: '3-4-1-2',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 3),
            ...fixed('CM', 3),
            ...flex(['W', 'FB'], 2),
            ...fixed('ST', 2),
        ]
    },

    '3-4-3': {
        name: '3-4-3',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 3),
            ...fixed('CM', 2),
            ...flex(['W', 'FB'], 2),
            ...fixed('W', 2),
            ...fixed('ST', 1),
        ]
    },

    '3-3-1-3': {
        name: '3-3-1-3',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 3),
            ...fixed('CM', 4),
            ...fixed('W', 2),
            ...fixed('ST', 1),
        ]
    },

    '5-2-3': {
        name: '5-2-3',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 3),
            ...fixed('CM', 2),
            ...flex(['W', 'FB'], 2),
            ...fixed('W', 2),
            ...fixed('ST', 1),
        ]
    },

    '4-3-1-2': {
        name: '4-2-3-1',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 2),
            ...fixed('FB', 2),
            ...fixed('CM', 4),
            ...fixed('ST', 2),
        ]
    },

    '4-2-2-2': {
        name: '4-2-2-2',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 2),
            ...fixed('FB', 2),
            ...fixed('CM', 2),
            ...flex(['W', 'CM'], 2),
            ...fixed('ST', 2),
        ]
    },

    '3-4-2-1': {
        name: '3-4-2-1',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 3),
            ...flex(['W', 'FB'], 2),
            ...fixed('CM', 4),
            ...fixed('ST', 1),
        ]
    },

    '3-3-3-1': {
        name: '3-3-3-1',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 3),
            ...flex(['W', 'FB'], 2),
            ...fixed('CM', 2),
            ...fixed('W', 2),
            ...fixed('ST', 1),
        ]
    },

    '3-2-4-1': {
        name: '3-2-4-1',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 3),
            ...fixed('CM', 4),
            ...flex(['W', 'FB'], 2),
            ...fixed('ST', 1),
        ]
    },

    '5-2-2-1': {
        name: '5-2-2-1',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 3),
            ...flex(['W', 'FB'], 2),
            ...fixed('CM', 4),
            ...fixed('ST', 1),
        ]
    },

    '2-3-4-1': {
        name: '2-3-4-1',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 2),
            ...fixed('CM', 5),
            ...fixed('W', 2),
            ...fixed('ST', 1),
        ]
    },

    '4-1-4-1': {
        name: '4-1-4-1',
        slots: [
            ...fixed('GK', 1),
            ...fixed('CB', 2),
            ...fixed('FB', 2),
            ...fixed('CM', 3),
            ...fixed('W', 2),
            ...fixed('ST', 1),
        ]
    }
}

export const FORMATIONS = Object.keys(FORMATION_DEFINITIONS) as Formation[]
export type Formation = keyof typeof FORMATION_DEFINITIONS

// Get the slots for a given formation
export function getFormationSlots(formation: Formation): FormationSlot[] {
    return FORMATION_DEFINITIONS[formation]?.slots ?? []
}

// Get position rows for rendering on the pitch
// Groups slots by position type for display purposes
export function getFormationRows(formation: Formation): { label: string; slots: FormationSlot[] }[] {
    const slots = getFormationSlots(formation)
    const rows: { label: string; slots: FormationSlot[] }[] = []

    const gk = slots.filter(s => s.type === 'fixed' && s.position === 'GK')
    const cb = slots.filter(s => s.type === 'fixed' && s.position === 'CB')
    const fb = slots.filter(s => s.type === 'fixed' && s.position === 'FB')
    const cm = slots.filter(s => s.type === 'fixed' && s.position === 'CM')
    const w = slots.filter(s => s.type === 'fixed' && s.position === 'W')
    const st = slots.filter(s => s.type === 'fixed' && s.position === 'ST')
    const flexibleSlots = slots.filter(s => s.type === 'flexible')

    if (gk.length) rows.push({ label: 'GK', slots: gk})

    // defenders row = CBs and FBs together
    const defenders: FormationSlot[] = []
    if (fb.length >= 2 && cb.length >= 2) {
        defenders.push(fb[0])
        defenders.push(...cb)
        defenders.push(fb[1])
    } else {
        defenders.push(...cb, ...fb)
    }

    if (defenders.length) rows.push({ label: 'DEF', slots: defenders })

    //Midfield row = CMs - flex slots
    const midfield: FormationSlot[] = []
    if (flexibleSlots.length >= 2) {
        midfield.push(flexibleSlots[0])
        midfield.push(...cm)
        midfield.push(flexibleSlots[1])
    } else {
        midfield.push(...cm)
    }

    if (midfield.length) rows.push({ label: 'MID', slots: midfield })

    // Attacking row: STs and Ws
    const attackers: FormationSlot[] = []
    if (w.length >= 2) {
        attackers.push(w[0])
        attackers.push(...st)
        attackers.push(w[1])
    } else {
        attackers.push(...st)
    }

    if (attackers.length) rows.push({ label: 'ATT', slots: attackers })

    return rows
}

// Map detailed sportmonks position_id to our Position Type
export const DETAILED_POSITION_MAP: Record<number, PositionType> = {
    148: 'CB', // Centre Back
    149: 'CM', // Defensive Midfield
    150: 'CM', // Attacking Midfield
    151: 'ST', // Centre Forward
    152: 'W',  // Left Wing
    153: 'CM', // Central Midfield
    154: 'FB', // Right Back
    155: 'FB', // Left Back
    156: 'W',  // Right Wing
    157: 'W',  // Left Midfield
    158: 'W',  // Right Midfield
}

export function getPositionType (
    detailedPositionId: number | null | undefined,
    broadPositionId?: number | null
) : PositionType | null {
    if (broadPositionId === 24) return 'GK'
    if (!detailedPositionId) return null
    return DETAILED_POSITION_MAP[detailedPositionId] ?? null
}

// Check if a players detailed position can fill a given slot
export function canFillSlot(slot: FormationSlot, detailedPositionType: PositionType): boolean {
    if (slot.type === 'fixed') return slot.position === detailedPositionType
    return slot.positions.includes(detailedPositionType)
}

export function isSupportedFormation(formation: string | null): formation is Formation {
  if (!formation) return false
  return formation in FORMATION_DEFINITIONS
}