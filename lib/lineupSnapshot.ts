export type SnapshotPlayer = {
    playerId: number
    rosterSlot: string
    slotOrder: number
}

export type LivePlayer = {
    id: string // FantasyTeamPlayer.id
    playerId: number
}

export type MergedLineupPlayer = {
    id: string
    playerId: number
    rosterSlot: string
    slotOrder: number
}

/**
 * Produces the starting lineup state for SetLineup.tsx
 * - Players in both the last snapshot and the current live roster keep thier
 *   snapshot rosterSlot/slotOrder (this is "what was locked in").
 * - Players on the live roster who were NOT in the last snapshot (new adds,
 *   e.g. from waivers) default to RESERVE with slotOrder 0.
 * = Players in the last snapshot who are no longer on the live roster 
 *   (dropped since) are excluded entirely.
 */
export function mergeLineupWithSnapshot(
    livePlayers: LivePlayer[],
    lastSnapshot: SnapshotPlayer[] | null
) : MergedLineupPlayer[] {
    if (!lastSnapshot || lastSnapshot.length === 0) {
        // No prior snapshot - everyone starts as unassigned RESERVE
        return livePlayers.map(p => ({
            id: p.id,
            playerId: p.playerId,
            rosterSlot: 'RESERVE',
            slotOrder: 0
        }))
    }

    const snapshotByPlayerId = new Map(lastSnapshot.map(s => [s.playerId, s]))

    return livePlayers.map(p => {
        const snap = snapshotByPlayerId.get(p.playerId)
        if (snap) {
            return {
                id: p.id,
                playerId: p.playerId,
                rosterSlot: snap.rosterSlot,
                slotOrder: snap.slotOrder
            }
        }
        // New player not in the last snapshot - default to unassigned reserve
        return {
            id: p.id,
            playerId: p.playerId,
            rosterSlot: 'RESERVE',
            slotOrder: 0
        }
    })
}