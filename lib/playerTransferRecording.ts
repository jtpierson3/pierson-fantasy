import { prisma } from '@/lib/prisma'
import { getPlayerTransfers } from '@/lib/sportmonks'
import { logApiCall } from '@/lib/apiCallBudget'

export async function recordDeparture(playerId: number) {
    let sportmonksTransferId: number | null = null
    let transferTypeId: number | null = null
    let suggestedAmount: number | null = null
    let toTeamId: number | null = null

    try {
        const { transfers, remaining } = await getPlayerTransfers(playerId)

        await logApiCall(`transfers/players/${playerId}`, 'PLAYER_TRANSFER_LOOKUP', {
            triggeredBy: 'sync-admin-panel',
            remainingAfterCall: remaining
        })

        const sorted = [...transfers].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        const latest = sorted[0]

        if (latest) {
            sportmonksTransferId = latest.id
            transferTypeId = latest.type_id ?? null
            suggestedAmount = latest.amount ?? null
            toTeamId = latest.to_team_id ?? null
        }
    } catch (err) {
        console.error(`[recordDeparture] failed to fetch transfer data for player ${playerId}:`, err)
    }

    // Deduplication - if we already have a record for this exact real transfer, skip entirely
    if (sportmonksTransferId !== null) {
        const existing = await prisma.playerTransfer.findUnique({
            where: { sportmonksTransferId }
        })
        if (existing) return
    }

    // Capture the player's current team before we overwrite it, so the transfer record
    // keeps some history of the team this player was on previously.
    const currentPlayer = await prisma.player.findUnique({
        where: { id: playerId },
        select: { teamId: true }
    })
    const formerTeamId = currentPlayer?.teamId ?? null

    // Only set teamId to the destination if it's a club we actually track;
    // otherwise null, rather than claiming false precision about an untracked
    // club when it could change later
    const trackedDestinationTeam = toTeamId
        ? await prisma.team.findUnique({ where: { id: toTeamId } })
        : null

    const newTeamId = trackedDestinationTeam ? trackedDestinationTeam.id : null

    await prisma.player.update({
        where: { id: playerId },
        data: { teamId: newTeamId }
    })

    // check current fantasy ownership auto-confirm if nobody has them,
    // leave pending for review if someone does (so a payout can be assigned)
    const fantasyOwner = await prisma.fantasyTeamPlayer.findFirst({
        where: { playerId },
        select: { fantasyTeamId: true }
    })

    await prisma.playerTransfer.create({
        data: {
            sportmonksTransferId,
            playerId,
            formerTeamId,
            formerFantasyTeamId: fantasyOwner?.fantasyTeamId ?? null,
            transferTypeId,
            suggestedAmount,
            status: fantasyOwner ? 'pending_review': 'confirmed',
            reviewedAt: fantasyOwner ? null : new Date(),
        }
    })
}