import { getPositionType, canFillSlot, type FormationSlot, PositionType } from '@/lib/formations'

export type PlayerGameweekData = {
    fantasyTeamPlayerId: string
    playerId: number
    points: number
    positionPlayedId: number | null
    broadPositionPlayedId: number | null
    didPlay: boolean
    rank?: number
}

export type StarterSlotAssignment = {
    slotIndex: number
    slot: FormationSlot
    originalStarter: PlayerGameweekData
}

export type ResolvedSlotResult = {
    slotIndex: number
    finalPlayer: PlayerGameweekData
    displacedPlayer: PlayerGameweekData | null
    rule: 'NONE' | 'STANDARD_SUB' | 'RESERVE_UPGRADE' | 'NOBODY_ELIGIBLE'
}

export type AutoSubstitutionResult = {
    slots: ResolvedSlotResult[]
}

/**
 * The REAL position a player played this gameweek - independent of whatever roster slot
 * (starter/sub, and which slot) they were originally assigned to. A player slotted as a 
 * fantasy ST could play any position in the real match. Bucket membership is always
 * driven by played position, not original slot assignment
 */
function getPlayedPosition(player: PlayerGameweekData): PositionType | null {
    return getPositionType(player.positionPlayedId, player.broadPositionPlayedId)
}

/**
 * Resolves Standard Subs using a bucket-based approach
 * 
 * Every player involved - whether a starter or a sub - is grouped purely by the REAL
 * position they played this gameweek, not by their roster slot. For each fixed-
 * position bucket, the top N scorers (N being the number of slots needing that exact
 * position) win those slots. Anyone bumped out of a fixed bucket who is ALSO eligible
 * for the formation's flexible slot type flows into that flex bucket which is solved
 * the same way.
 * 
 * Assumes at most one flex position group per formation (true for every formation supported)
 */
export function resolveAutoSubstitutions(
    starterSlots: StarterSlotAssignment[],
    subs: PlayerGameweekData[]
): AutoSubstitutionResult {
    const fixedSlotAssignments = starterSlots.filter(s => s.slot.type === 'fixed')
    const flexSlotAssignments = starterSlots.filter(s => s.slot.type === 'flexible')

    const flexPositions = flexSlotAssignments.length > 0
        ? (flexSlotAssignments[0].slot as { positions: PositionType[] }).positions
        : []

    // Every player in the picture - every starter AND every sub-
    // each carrying which slot (if any) they originally occupied
    type PoolEntry = { player: PlayerGameweekData; originalSlotIndex: number | null }

    const allStarters: PoolEntry[] = starterSlots.map(s => ({
        player: s.originalStarter,
        originalSlotIndex: s.slotIndex,
    }))
    const allSubs: PoolEntry[] = subs.map(s => ({ player: s, originalSlotIndex: null }))
    const wholePool = [...allStarters, ...allSubs]

    const finalAssignments = new Map<number, PlayerGameweekData>()
    const assignedPlayerIds = new Set<string>()

    function scoreFor(entry: PoolEntry): number {
        return entry.player.didPlay ? entry.player.points : -Infinity
    }

    /**
     * Assigns a set of winning candidates to a set of slots, preferring to keep any winner in
     * their OWN original slot (if they had one and it's among the slots being filled) - so a 
     * player who legitimately keeps their spot never gets reported as "changed" just because
     * of an arbitrary reassignment to an equivalent slot.
     */
    function assignWinnersToSlots(
        winners: PoolEntry[],
        slots: StarterSlotAssignment[]
    ) {
        const remainingWinners = [...winners]
        const remainingSlots = [...slots]

        // Pass 1: keep anyone who already owns one of these slots, in that slot
        for (let i = remainingSlots.length - 1; i>= 0; i--) {
            const slot = remainingSlots[i]
            const ownerIndex = remainingWinners.findIndex(
                w => w.originalSlotIndex === slot.slotIndex
            )
            if (ownerIndex !== -1) {
                finalAssignments.set(slot.slotIndex, remainingWinners[ownerIndex].player)
                assignedPlayerIds.add(remainingWinners[ownerIndex].player.fantasyTeamPlayerId)
                remainingWinners.splice(ownerIndex, 1)
                remainingSlots.splice(i, 1)
            }
        }

        // Pass 2: assign whoever's left to whatver slots remain, in order
        remainingSlots.forEach((slot, i) => {
            const entry = remainingWinners[i]
            finalAssignments.set(slot.slotIndex, entry.player)
            assignedPlayerIds.add(entry.player.fantasyTeamPlayerId)
        })
    }
    
    // --- Fixed Buckets, grouped by exact required position ---
    const fixedSlotsByPosition = new Map<PositionType, StarterSlotAssignment[]>()
    for (const slotAssignment of fixedSlotAssignments) {
        const position = (slotAssignment.slot as { position: PositionType }).position
        const list = fixedSlotsByPosition.get(position) ?? []
        list.push(slotAssignment)
        fixedSlotsByPosition.set(position, list)
    }

    const flexOverflowPool: PoolEntry[] = []

    for (const [position, slotAssignments] of fixedSlotsByPosition.entries()) {
        const bucketCandidates = wholePool.filter(
            entry => getPlayedPosition(entry.player) === position
        )

        const sorted = [...bucketCandidates].sort((a, b) => scoreFor(b) - scoreFor(a))
        const winners = sorted.slice(0, slotAssignments.length)
        const losers = sorted.slice(slotAssignments.length)

        assignWinnersToSlots(winners, slotAssignments)

        // Anyone who lost this bucket, but is ALSO eligible for the flex bucket's allowed
        // positions, flows there - regardless of sub or starter status
        if (flexPositions.includes(position)) {
            flexOverflowPool.push(...losers)
        }
    }

    // --- Flex Bucket ---
    if (flexSlotAssignments.length > 0) {
        const directFlexCandidates = wholePool.filter(entry => {
            const pos = getPlayedPosition(entry.player)
            return pos !== null && flexPositions.includes(pos) && !assignedPlayerIds.has(entry.player.fantasyTeamPlayerId)
        })

        // Combine direct candidates with overflow from fixed buckets, de-duped
        const combined = new Map<string, PoolEntry>()
        for (const entry of [...directFlexCandidates, ...flexOverflowPool]) {
            combined.set(entry.player.fantasyTeamPlayerId, entry)
        }

        const sorted = [...combined.values()].sort((a, b) => scoreFor(b) - scoreFor(a))
        const winners = sorted.slice(0,flexSlotAssignments.length)

        assignWinnersToSlots(winners, flexSlotAssignments)
    }

    // --- Build final results, comparing against original starters ---
    const results: ResolvedSlotResult[] = [...starterSlots]
        .sort((a, b) => a.slotIndex - b.slotIndex)
        .map(({ slotIndex, originalStarter }) => {
            const finalPlayer = finalAssignments.get(slotIndex) ?? originalStarter
            const changed = finalPlayer.fantasyTeamPlayerId !== originalStarter.fantasyTeamPlayerId
            return {
                slotIndex,
                finalPlayer,
                displacedPlayer: changed ? originalStarter: null,
                rule: changed ? ('STANDARD_SUB' as const) : ('NONE' as const)
            }
        })

    return { slots: results }
}

/**
 * Resolves Reserve Relief for whatever slots are still empty after Rule 2 and the week is finalized.
 * Fixed position slots are resolved first, then the flex spot with whoevers lefrt, so a narrowly
 * eligible reserve isn't stranded by a flex slot claiming them first.
 */
export function resolveReserveUpgrades(
    emptySlots: StarterSlotAssignment[],
    reserves: PlayerGameweekData[]
): Map<number, PlayerGameweekData> {
    if (emptySlots.length === 0) return new Map()

    const fixedEmptySlots = emptySlots.filter(s => s.slot.type === 'fixed')
    const flexEmptySlots = emptySlots.filter(s => s.slot.type === 'flexible')

    const sortedReserves = [...reserves].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    const usedReserveIds = new Set<string>()
    const assignments = new Map<number, PlayerGameweekData>()

    function fillSlots(slots: StarterSlotAssignment[]) {
        for (const { slotIndex, slot } of slots) {
            const firstEligible = sortedReserves.find( r => {
                if (usedReserveIds.has(r.fantasyTeamPlayerId)) return false
                if (!r.didPlay) return false
                const position = getPlayedPosition(r)
                if (position === null) return false
                return canFillSlot(slot, position)
            })

            if (firstEligible) {
                usedReserveIds.add(firstEligible.fantasyTeamPlayerId)
                assignments.set(slotIndex, firstEligible)
            }
        }
    }

    fillSlots(fixedEmptySlots)
    fillSlots(flexEmptySlots)

    return assignments
}

/**
 * Runs both Standard Sub and Reserve Upgrade in sequence - meant to be called once gameweek is
 * finalized. All rules are independent and only consider the state that the lineup is in after
 * the previous rule has done it's thing.
 */
export function finalizeLineup(
    starterSlots: StarterSlotAssignment[],
    subs: PlayerGameweekData[],
    reserves: PlayerGameweekData[]
): ResolvedSlotResult[] {
    const { slots: ruleTwoResults } = resolveAutoSubstitutions(starterSlots, subs)

    const emptySlotAssignments = starterSlots.filter(({ slotIndex, slot, originalStarter }) => {
        const ruleTwoResult = ruleTwoResults.find(r => r.slotIndex === slotIndex)
        if (ruleTwoResult?.rule !== 'NONE') return false
        if (originalStarter.didPlay) return false

        const hadAnyEligibleSubAtAll = subs.some(s => {
            const position = getPlayedPosition(s)
            return position !== null && canFillSlot(slot, position)
        })
        return !hadAnyEligibleSubAtAll
    })

    const reserveAssignments = resolveReserveUpgrades(emptySlotAssignments, reserves)

    return ruleTwoResults.map(result => {
        const reservePick = reserveAssignments.get(result.slotIndex)
        if (reservePick) {
            return {
                ...result,
                FinalPlayer: reservePick,
                displacedPlayer: result.finalPlayer,
                rule: 'RESERVE_UPGRADE' as const
            }
        }
        const isStillEmpty = emptySlotAssignments.some(s => s.slotIndex === result.slotIndex)
        if (isStillEmpty) {
            return { ...result, rule: 'NOBODY_ELIGIBLE' as const }
        }
        return result
    })
}