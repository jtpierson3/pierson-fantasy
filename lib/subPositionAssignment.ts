const SUBSTITUTION_EVENT_TYPE_ID = 18

export type SubstitutionEvent = {
    type_id: number
    player_id: number | null
    related_player_id: number | null
}

/**
 * For each substitution event, if the player coming on has no resolvable position,
 * assign them the position of the player they replaced (the position field they're
 * replacing on the pitch is usually the closest available signal for a sub since 
 * Sportmonks didn't tag with a real position). Never overwrites a position 
 * Sportmonks already provided.
 */
export function resolveSubstitutePositions(
    events: SubstitutionEvent[],
    positionByPlayerId: Map<number, number | null>
): Map<number, number> {
    const assignments = new Map<number, number>()

    for (const event of events) {
        if (event.type_id !== SUBSTITUTION_EVENT_TYPE_ID) continue

        const incomingPlayerId = event.player_id
        const outgoingPlayerId = event.related_player_id
        if (!incomingPlayerId || !outgoingPlayerId) continue

        const incomingHasPosition = positionByPlayerId.get(incomingPlayerId)
        if (incomingHasPosition != null) continue // Sportmonks already gave us one - don't override

        const outgoingPosition = positionByPlayerId.get(outgoingPlayerId)
        if (outgoingPosition == null) continue // outgoing player's own position is unresolved (leave for manual review)

        assignments.set(incomingPlayerId, outgoingPosition)
    }

    return assignments
}