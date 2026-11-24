/**
 * Lowest unused position in 1... max. Used when a player is dropped into an empty
 * bench/reserve slot, so a gap left by a departed player gets refilled instead of
 * colliding with an existing position. If 1 ... max are all taken, returns max +1 so
 * server validation fails loudly instead of silently duplicating.
 */
export function nextOpenOrder(usedOrders: number[], max: number): number {
    const used = new Set(usedOrders)
    for (let n = 1; n <= max; n++) {
        if (!used.has(n)) return n
    }
    return max + 1
}