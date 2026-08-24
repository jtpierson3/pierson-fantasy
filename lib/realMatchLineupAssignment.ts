import { getFormationRows, getPositionType, canFillSlot, type Formation, type FormationSlot } from './formations'

export type RealMatchPlayer = {
    id: string
    playerId: number
    positionPlayedId: number | null
    broadPositionId: number | null
    [key: string]: unknown
}

/**
 * Assigns real match starters to formation slots, purely by position -
 * no slotOrder/pinning concept at all, since real match data has no such
 * thing (unlike fantasy lineups, where a user explicitly places each player
 * in a specific slot). Each formation slot claims the first unclaimed player
 * who genuinely fills it; a player can never be assigned to more than one slot,
 * and a slot with no matching player stays empty.
 */
export function assignRealMatchLineup<T extends RealMatchPlayer>(
    formation: Formation,
    starters: T[]
): { rows: { label: string; slots: FormationSlot[]; assigned: (T | null)[] }[]; unassigned: T[] } {
    const rows = getFormationRows(formation)
    const remaining = [...starters]

    const flatSlots = rows.flatMap((row, rowIndex) =>
        row.slots.map((slot, slotIndex) => ({ slot, rowIndex, slotIndex }))
    )
    const fixedSlots = flatSlots.filter(s => s.slot.type === 'fixed')
    const flexSlots = flatSlots.filter(s => s.slot.type === 'flexible')

    const assignments = new Map<string, T>()

    function assignBatch(slots: typeof flatSlots) {
        for (const { slot, rowIndex, slotIndex } of slots) {
            const matchIndex = remaining.findIndex(player => {
                const positionType = getPositionType(player.positionPlayedId, player.broadPositionId)
                return positionType !== null && canFillSlot(slot, positionType)
            })
            if (matchIndex === -1) continue
            const [matched] = remaining.splice(matchIndex, 1)
            assignments.set(`${rowIndex}-${slotIndex}`, matched)
        }
    }

    assignBatch(fixedSlots)
    assignBatch(flexSlots)

    const resultRows = rows.map((row, rowIndex) => ({
        label: row.label,
        slots: row.slots,
        assigned: row.slots.map((_, slotIndex) => assignments.get(`${rowIndex}-${slotIndex}`) ?? null) 
    }))

    return { rows: resultRows, unassigned: remaining }
}