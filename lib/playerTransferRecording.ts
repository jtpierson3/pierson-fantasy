import { prisma } from '@/lib/prisma'
import { getPlayerTransfers } from '@/lib/sportmonks'
import { logApiCall } from '@/lib/apiCallBudget'

export async function recordDeparture(playerId: number) {
    const currentPlayer = await prisma.player.findUnique({
        where: { id: playerId },
        select: { teamId: true }
    })
    const formerTeamId = currentPlayer?.teamId ?? null

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

    // Safety check - if the "most recent" transer we can see claims the player is joining
    // the SAME team they've just been detected as absent from that is a contradiction:
    // the real trasnfer (likely a loan to/from an untracked club) isn't visible in our data.
    // Don't trust it - just clear their team rather than record misleading transfer data.
    // If/when they return to a premier league club then PlayerTransfer will be updated accordingly.
    if (toTeamId !== null && toTeamId === formerTeamId) {
        await prisma.player.update({
            where: { id: playerId },
            data: { teamId: null }
        })
        return
    }

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

    // Premier League -> Premier League (or any tracked club -> tracked club)
    // transfer - the player is still fully usable in the league.
    // No payout, no roster impact, nothing to review, stop here.
    if (trackedDestinationTeam) {
        return
    }

    // Deduplication - if we already have a record for this exact real transfer, skip entirely
    if (sportmonksTransferId !== null) {
        const existing = await prisma.playerTransfer.findUnique({
            where: { sportmonksTransferId }
        })
        if (existing) return
    }

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