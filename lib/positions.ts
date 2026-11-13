/** The four broad Sportmonks positions */
export const POSITION_ID = { GK: 24, DEF: 25, MID: 26, ATT: 27 } as const

/**
 * Sportmoks sometimes returns 24 (the broad "Goalkeeper" type) as a match's positionPlayedId
 * instead of a detailed sub-position. For match context that is authoritative GK detection,
 * whatever the player's stored position says.
 */
export const GOALKEEPER_POSITION_ID = POSITION_ID.GK

/**
 * The "broad position" argument getPositionType expects, derived from a match's positionPlayedId:
 * 24 when it is the broad Goalkeeper id, otherwise null (a detailed position decides on its own).
 */
export function toBroadPositionId(positionPlayedId: number | null | undefined): 24 | null {
    return positionPlayedId === GOALKEEPER_POSITION_ID ? GOALKEEPER_POSITION_ID : null
}

export const POSITIONS: Record<number, { name: string; short: string }> = {
    [POSITION_ID.GK]: { name: 'Goalkeeper', short: 'GK' },
    [POSITION_ID.DEF]: { name: 'Defender', short: 'DEF' },
    [POSITION_ID.MID]: { name: 'Midfielder', short: 'MID' },
    [POSITION_ID.ATT]: { name: 'Attacker', short: 'ATT' },
}

export const DETAILED_POSITIONS: Record<number, { name: string; short: string; parentPositionId: number }> = {
    148: { name: 'Centre Back', short: 'CB', parentPositionId: 25 },
    149: { name: 'Defensive Midfield', short: 'CDM', parentPositionId: 26 },
    150: { name: 'Attacking Midfield', short: 'CAM', parentPositionId: 26 },
    151: { name: 'Centre Forward', short: 'CF', parentPositionId: 27 },
    152: { name: 'Left Wing', short: 'LW', parentPositionId: 26 },
    153: { name: 'Central Midfield', short: 'CM', parentPositionId: 26 },
    154: { name: 'Right Back', short: 'RB', parentPositionId: 25 },
    155: { name: 'Left Back', short: 'LB', parentPositionId: 25 },
    156: { name: 'Right Wing', short: 'RW', parentPositionId: 26 },
    157: { name: 'Left Midfield', short: 'LM', parentPositionId: 26},
    158: { name: 'Right Midfield', short: 'RM', parentPositionId: 26 },
}

export function getPositionLabel(positionId: number | null | undefined): string {
    if (!positionId) return 'Unknown'
    return POSITIONS[positionId]?.name ?? 'Unknown'
}

export function getPositionShort(positionId: number | null | undefined): string {
    if (!positionId) return 'N/A'
    return POSITIONS[positionId]?.short ?? 'N/A'
}

const POSITION_COLORS: Record<number, string> = {
    [POSITION_ID.GK]: 'bg-yellow-100 text-yellow-700',
    [POSITION_ID.DEF]: 'bg-blue-100 text-blue-700',
    [POSITION_ID.MID]: 'bg-green-100 text-green-700',
    [POSITION_ID.ATT]: 'bg-red-100 text-red-700',
}

export function getPositionColor(positionId: number): string {
    return POSITION_COLORS[positionId] ?? 'bg-gray-100 text-gray-500'
}