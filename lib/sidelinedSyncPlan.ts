export type SidelinedEntryRef = { id: number; player_id: number }

export type OpenManualRow = { id: string; playerId: number }

export type SidelinedEntryPlan =
    | { action: 'skip-unknown-player' }
    | { action: 'claim-manual'; manualRowId: string }
    | { action: 'upsert' }

/**
 * Decides, for each Sportmonks sidelined entry, what the sync should do - without touching
 * the database. Result is parallel to `entries`.
 * 
 * - Entries for players we don't have are skipped.
 * - Entries we already store (by Sportmonks id) are plain upserts
 * - A brand new entry takes over the player's manual row if there is one, so an
 *   admin's manual entry becomes the synced one instead of duplicating it. Each manual
 *   row can be taken over by only one entry.
 */
export function planSidelinedEntries(
    entries: SidelinedEntryRef[],
    knownPlayerIds: ReadonlySet<number>,
    existingSportmonksIds: ReadonlySet<number>,
    openManualRows: OpenManualRow[]
): SidelinedEntryPlan[] {
    const manualByPlayer = new Map<number, string[]>()
    for (const row of openManualRows) {
        const queue = manualByPlayer.get(row.playerId) ?? []
        queue.push(row.id)
        manualByPlayer.set(row.playerId, queue)
    }

    return entries.map((entry): SidelinedEntryPlan => {
        if (!knownPlayerIds.has(entry.player_id)) return { action: 'skip-unknown-player' }
        if (existingSportmonksIds.has(entry.id)) return { action: 'upsert' }

        const manualRowId = manualByPlayer.get(entry.player_id)?.shift()
        if (manualRowId) return { action: 'claim-manual', manualRowId }
        return { action: 'upsert' }
    })
}
