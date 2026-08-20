import { prisma } from '@/lib/prisma'
import { finalizeLineup, ResolvedSlotResult, type PlayerGameweekData, type StarterSlotAssignment } from './autoSubstitution'
import { getFormationRows, type Formation } from './formations'

export async function resolveGameweekLineup(
    fantasyTeamId: string,
    gameweekId: string
): Promise<ResolvedSlotResult[] | null> {
    const gameweek = await prisma.fantasyGameweek.findUnique({
        where: { id: gameweekId },
        select: { gameweekNumber: true }
    })
    if (!gameweek) return null

    const snapshot = await prisma.gameweekLineup.findUnique({
        where: { fantasyTeamId_gameweekId: { fantasyTeamId, gameweekId } },
        include: { players: { include: { player: true } } }
    })
    if (!snapshot) return null

    const allPlayerIds = snapshot.players.map(p => p.playerId)

    // One batched fetch for every player's match stats this gameweek
    const allStatsRows = await prisma.playerMatchStats.findMany({
        where: { playerId: { in: allPlayerIds }, fixture: { gameweekNumber: gameweek.gameweekNumber } }
    })

    // One batched fetch for every player's calculated points this gameweek
    const allPointsRows = await prisma.playerFixturePoints.findMany({
        where: { playerId: { in: allPlayerIds }, fixture: { gameweekNumber: gameweek.gameweekNumber } }
    })

    // Group both by playerId for fast lookup
    const statsByPlayer = new Map<number, typeof allStatsRows>()
    for (const row of allStatsRows) {
        const list = statsByPlayer.get(row.playerId) ?? []
        list.push(row)
        statsByPlayer.set(row.playerId, list)
    }

    const pointsByPlayer = new Map<number, number>()
    for (const row of allPointsRows) {
        pointsByPlayer.set(row.playerId, (pointsByPlayer.get(row.playerId) ?? 0) + row.points)
    }

    function buildPlayerGameweekData(
        fantasyTeamPlayerId: string,
        playerId: number,
        broadPositionId: number | null,
        rank?: number
    ): PlayerGameweekData {
        const statsRows = statsByPlayer.get(playerId) ?? []
        const totalMinutes = statsRows.reduce((sum, s) => sum + s.minutesPlayed, 0)
        const didPlay = totalMinutes > 0
        const primaryRow = [...statsRows].sort((a, b) => b.minutesPlayed - a.minutesPlayed)[0]

        return {
            fantasyTeamPlayerId,
            playerId,
            points: pointsByPlayer.get(playerId) ?? 0,
            positionPlayedId: primaryRow?.positionPlayedId ?? null,
            broadPositionPlayedId: broadPositionId,
            didPlay,
            rank
        }
    }

    const starters = snapshot.players.filter(p => p.rosterSlot === 'STARTER')
    const subs = snapshot.players.filter(p => p.rosterSlot === 'SUB')
    const reserves = snapshot.players.filter(p => p.rosterSlot === 'RESERVE')

    const formationRows = getFormationRows(snapshot.formation as Formation)
    const allSlots = formationRows.flatMap(r => r.slots)

    const starterSlotAssignments: StarterSlotAssignment[] = []
    for (const starter of starters) {
        const slot = allSlots[starter.slotOrder]
        if (!slot) continue
        const data = buildPlayerGameweekData(starter.id, starter.playerId, starter.player.position_id)
        starterSlotAssignments.push({ slotIndex: starter.slotOrder, slot, originalStarter: data })
    }

    const subData = subs.map(sub => 
        buildPlayerGameweekData(sub.id, sub.playerId, sub.player.position_id)
    )

    const reserveData = reserves.map(reserve => 
        buildPlayerGameweekData(reserve.id, reserve.playerId, reserve.player.position_id)
    )

    return finalizeLineup(starterSlotAssignments, subData, reserveData)

}