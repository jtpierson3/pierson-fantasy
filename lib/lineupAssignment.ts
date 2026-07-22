import {
    getPositionType,
    canFillSlot,
    type FormationSlot
} from '@/lib/formations'

// Minimal Shape needed for assignment - works for any player-with-slot type
export type SlotAssignable = {
    id: string
    slotOrder: number
    player: {
        position_id: number | null
        detailed_position_id: number | null
    }
}

export function assignAllRows<T extends SlotAssignable>(
    rows: { label: string; slots: FormationSlot[] } [],
    availablePlayers: T[]
) {
    const allSlots = rows.flatMap(r => r.slots)
    const slotCount = allSlots.length
    const slotAssignments: (T | null)[] = Array(slotCount).fill(null)
    const remaining = [...availablePlayers]

    availablePlayers.forEach(p => {
        const idx = p.slotOrder
        if (idx >= 0 && idx < slotCount && slotAssignments[idx] === null) {
            slotAssignments[idx] = p
            remaining.splice(remaining.findIndex(r => r.id === p.id), 1)
        }
    })

    slotAssignments.forEach((assigned, idx) => {
        if (assigned !== null) return
        const slot = allSlots[idx]
        const matchIdx = remaining.findIndex(p => {
            if (p.slotOrder !== 0) return false
            const posType = getPositionType(
                p.player.detailed_position_id,
                p.player.position_id
            )
            return posType !== null && canFillSlot(slot, posType)
        })
        if (matchIdx !== -1) {
            slotAssignments[idx] = remaining[matchIdx]
            remaining.splice(matchIdx, 1)
        }
    })

    let slotIdx = 0
    const result = rows.map(row => ({
        ...row,
        assigned: row.slots.map(() => slotAssignments[slotIdx++])
    }))

    return { result, overflow: remaining }
}