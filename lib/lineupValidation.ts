import { RosterSlot } from '@prisma/client'
import { getFormationSlots, isSupportedFormation, type Formation } from '@/lib/formations'

const MAX_SUBS = 5
const VALID_SLOTS = new Set<string>(Object.values(RosterSlot))

export type RosterEntry = { id: string; playerId: number }

export type ValidatedLineupPlayer = {
    id: string
    playerId: number
    rosterSlot: RosterSlot
    slotOrder: number
}

export type LineupValidationResult =
    | { valid: true; formation: Formation; players: ValidatedLineupPlayer[] }
    | { valid: false; error: string }

function fail(error: string): LineupValidationResult {
    return { valid: false, error }
}

/**
 * Validates a client-submitted lineup against the team's real roster. Position
 * eligibility is deliberately NOT checked here - auto-substitution handles
 * mismatches at scoring time.
 */
export function validateLineupSubmission(
    formation: unknown,
    players: unknown,
    roster: RosterEntry[]
): LineupValidationResult {
    if (typeof formation !== 'string' || !isSupportedFormation(formation)) {
        return fail('Unsupported formation')
    }
    if (!Array.isArray(players)) return fail('players must be an array')
    if (players.length !== roster.length) {
        return fail('Lineup must include every player on your roster exactly once')
    }

    const playerIdByRosterId = new Map(roster.map(r => [r.id, r.playerId]))
    const seen = new Set<string>()
    const parsed: ValidatedLineupPlayer[] = []

    for (const entry of players) {
        if (typeof entry !== 'object' || entry === null) return fail('Invalid player entry')
        const { id, playerId, rosterSlot, slotOrder } = entry as Record<string, unknown>

        if (
            typeof id !== 'string' ||
            typeof playerId !== 'number' ||
            typeof slotOrder !== 'number' ||
            !Number.isInteger(slotOrder) ||
            slotOrder < 0
        ) {
            return fail('Invalid player entry')
        }
        if (typeof rosterSlot !== 'string' || !VALID_SLOTS.has(rosterSlot)) {
            return fail('Invalid player entry')
        }
        // Id and playerId must match as a pair against the caller's real roster
        if (playerIdByRosterId.get(id) !== playerId) {
            return fail('Lineup contains a player that is not on your roster')
        }
        if (seen.has(id)) return fail('Lineup contains a duplicate player')
        seen.add(id)

        parsed.push({ id, playerId, rosterSlot: rosterSlot as RosterSlot, slotOrder })
    }

    const slotCount = getFormationSlots(formation).length

    const starterOrders = parsed.filter(p => p.rosterSlot === 'STARTER').map(p => p.slotOrder)
    if (
        starterOrders.length > slotCount ||
        new Set(starterOrders).size !== starterOrders.length ||
        starterOrders.some(o => o >= slotCount)
    ) {
        return fail(`Starters must occupy distinct slots of the ${formation} formation`)
    }

    const subOrders = parsed.filter(p => p.rosterSlot === 'SUB').map(p => p.slotOrder)
    if (
        subOrders.length > MAX_SUBS ||
        new Set(subOrders).size !== subOrders.length ||
        subOrders.some(o => o < 1 || o > MAX_SUBS)
    ) {
        return fail(`Substitutes must use distinct positions 1-${MAX_SUBS}`)
    }

    return { valid: true, formation, players: parsed }
}