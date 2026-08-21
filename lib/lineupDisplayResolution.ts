export type RawSnapshotPlayer = {
    id: string
    playerId: number
    rosterSlot: string
    slotOrder: number
    resolvedPlayerId: number | null
    subRule: string | null
    displacedByPlayerId: number | null
}

export type DisplayLineupPlayer = {
    id: string
    playerId: number
    rosterSlot: string
    slotOrder: number
    subResultInfo: {
        rule: 'STANDARD_SUB' | 'RESERVE_UPGRADE' | 'NOBODY_ELIGIBLE'
        role: 'IN' | 'OUT'
    } | null
}

export function buildDisplayLineup(rawPlayers: RawSnapshotPlayer[]): DisplayLineupPlayer[] {
    return rawPlayers.map(row => {
        if (row.resolvedPlayerId === null || row.subRule === null) {
            return {
                id: row.id,
                playerId: row.playerId,
                rosterSlot: row.rosterSlot,
                slotOrder: row.slotOrder,
                subResultInfo: null
            }
        }

        // This row shows a DIFFERENT player than who originally owned it.
        // If this row was originally a STARTER, the new occupant is coming IN.
        // If this row was originally a SUB/RESERVE the new occupant (the displaced
        // starter) has come OUT to the bench)
        const role = row.rosterSlot === 'STARTER' ? 'IN' : 'OUT'

        return {
            id: row.id,
            playerId: row.resolvedPlayerId,
            rosterSlot: row.rosterSlot,
            slotOrder: row.slotOrder,
            subResultInfo: {
                rule: row.subRule as 'STANDARD_SUB' | 'RESERVE_UPGRADE' | 'NOBODY_ELIGIBLE',
                role
            }
        }
    })
}