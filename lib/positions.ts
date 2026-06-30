// Sportmonks position id mapping

export const POSITIONS: Record<number, { name: string; short: string }> = {
    24: { name: 'Goalkeeper', short: 'GK' },
    25: { name: 'Defender', short: 'DEF' },
    26: { name: 'Midfielder', short: 'MID' },
    27: { name: 'Attacker', short: 'FWD' },
    28: { name: 'Unknown', short: '?' },
}

export const DETAILED_POSITIONS: Record<number, { name: string; short: string; parentPositionId: number }> = {
    148: { name: 'Centre Back', short: 'CB', parentPositionId: 25 },
    149: { name: 'Defensive Midfield', short: 'CDM', parentPositionId: 26 },
    150: { name: 'Attacking Midfield', short: 'CAM', parentPositionId: 26 },
    151: { name: 'Centre Forward', short: 'CF', parentPositionId: 27 },
    152: { name: 'Left Wing', short: 'LW', parentPositionId: 27 },
    153: { name: 'Central Midfield', short: 'CM', parentPositionId: 26 },
    154: { name: 'Right Back', short: 'RB', parentPositionId: 25 },
    155: { name: 'Left Back', short: 'LB', parentPositionId: 25 },
    156: { name: 'Right Wing', short: 'RW', parentPositionId: 25 },
    157: { name: 'Left Midfield', short: 'LM', parentPositionId: 25 },
    158: { name: 'Right Midfield', short: 'RM', parentPositionId: 25 },
}

export function getPositionLabel(positionId: number | null | undefined): string {
    if (!positionId) return 'Unknown'
    return POSITIONS[positionId]?.name ?? 'Unknown'
}

export function getPositionShort(positionId: number | null | undefined): string {
    if (!positionId) return '?'
    return POSITIONS[positionId]?.short ?? '?'
}