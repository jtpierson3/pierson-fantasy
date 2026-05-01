export function getPositionShort(positionId: number): string {
    const positions: Record<number, string> = {
        24: 'GK',
        25: 'DEF',
        26: 'MID',
        27: 'ATT',
    }
    return positions[positionId] ?? 'N/A'
}

export function getPositionFull(positionId: number): string {
    const positions: Record<number, string> = {
        24: 'Goalkeeper',
        25: 'Defender',
        26: 'Midfielder',
        27: 'Attacker',
    }
    return positions[positionId] ?? 'Unknown'
}

export function getPositionColor(positionId: number): string {
    const colors: Record<number, string> = {
        24: 'bg-yellow-100 text-yellow-700',
        25: 'bg-blue-100 text-blue-700',
        26: 'bg-green-100 text-green-700',
        27: 'bg-red-100 text-red-700'
    }
    return colors[positionId] ?? 'bg-gray-100 text-gray-500'
}