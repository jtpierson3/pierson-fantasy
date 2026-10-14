import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { isWaiverWindowClosed } from '@/lib/fixtureTiming'
import { resolveTransferBids, type TransferBidInput, type TransferBidTeamInput } from '@/lib/transferBidResolution'
import { findCascadeInvalidations, type PendingClaimLike } from '@/lib/transferCascade'
import { resolveWaiverClaims, type WaiverClaimInput, type WaiverTeamInput } from '@/lib/waiverClaimResolution'
import { getWaiverPriorityOrder } from '@/lib/waiverPriorityOrder'

type Tx = Prisma.TransactionClient

export async function POST(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    try {
        const windowClosed = await isWaiverWindowClosed()
        if (!windowClosed) {
            return NextResponse.json({ message: 'Window is still open - nothing to process' })
        }

        const leagues = await prisma.fantasyLeague.findMany({
            where: { draftComplete: true },
            select: { id: true },
        })

        const results: Array<{ leagueId: string } & Record<string, unknown>> = []
        for (const league of leagues) {
            try {
                const result = await prisma.$transaction(
                    tx => processLeague(tx, league.id),
                    { timeout: 30000 }
                )
                results.push({ leagueId: league.id, ...result })
            } catch (err) {
                console.error(`[transfer-and-waiver-processing] league ${league.id} failed:`, err)
                results.push({ leagueId: league.id, error: 'Failed to process league' })
            } 
        }

        const failed = results.some(r => 'error' in r)
        return NextResponse.json({ success: !failed, results }, { status: failed ? 500 : 200 })
    } catch (err) {
        console.error('[transfer-and-waiver-processing] error:', err)
        return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
    }
}

async function processLeague(tx: Tx, leagueId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${leagueId}::text))`

    const now = new Date()

    const leagueTeams = await tx.fantasyTeam.findMany({
        where: { fantasyLeagueId: leagueId },
        select: {
            id: true,
            totalLeaguePoints: true,
            totalFantasyPoints: true,
            draftPosition: true,
            players: { select: { playerId: true, rosterSlot: true } },
        },
    })
    const waiverOrder = getWaiverPriorityOrder(leagueTeams)

    let bidsProcessed = 0
    let bidsWon = 0
    let bidsLost = 0
    let claimsKilled = 0

    const allPendingBids = await tx.transferBid.findMany({
        where: { status: 'pending', fantasyTeam: { fantasyLeagueId: leagueId } },
    })
    const allPendingClaims = await tx.waiverClaim.findMany({
        where: { status: 'pending', fantasyTeam: { fantasyLeagueId: leagueId } },
    })

    const rosteredInLeague = new Set(leagueTeams.flatMap(t => t.players.map(p => p.playerId)))
    const staleBidIds = allPendingBids.filter(b => rosteredInLeague.has(b.playerId)).map(b => b.id)
    const staleClaimIds = allPendingClaims.filter(c => rosteredInLeague.has(c.playerToAddId)).map(c => c.id)

    if (staleBidIds.length) {
        await tx.transferBid.updateMany({
            where: { id: { in: staleBidIds } },
            data: { status: 'lost', processedAt: now },
        })
        bidsProcessed += staleBidIds.length
        bidsLost += staleBidIds.length
    }
    if (staleClaimIds.length) {
        await tx.waiverClaim.updateMany({
            where: { id: { in: staleClaimIds } },
            data: { status: 'lost', processedAt: now },
        })
        claimsKilled += staleClaimIds.length
    }

    const pendingBids = allPendingBids.filter(b => !staleBidIds.includes(b.id))
    const pendingClaimsForCascade = allPendingClaims.filter(c => !staleClaimIds.includes(c.id))

    // ================== PHASE 1: Transfer Fund Bids ===========================
    let playersWonByBid = new Set<number>()

    if (pendingBids.length > 0) {
        const bidInputs: TransferBidInput[] = pendingBids.map(b => ({
            id: b.id,
            fantasyTeamId: b.fantasyTeamId,
            playerId: b.playerId,
            amount: b.amount,
            playerToDropId: b.playerToDropId,
        }))
        const teamInputs: TransferBidTeamInput[] = leagueTeams.map(t => ({
            id: t.id,
            standingsRank: waiverOrder.get(t.id) ?? Infinity,
            rosterPlayerIds: t.players.filter(p => p.rosterSlot !== 'IR').map(p => p.playerId),
        }))

        const { bidResults, winningDrops, fundsSpent, playersWon } = resolveTransferBids(bidInputs, teamInputs)

        const cascadeCandidates: PendingClaimLike[] = pendingClaimsForCascade.map(c => ({
            id: c.id,
            fantasyTeamId: c.fantasyTeamId,
            playerId: c.playerToAddId,
            playerToDropId: c.playerToDropId,
        }))
        const { invalidatedClaimIds } = findCascadeInvalidations(winningDrops, cascadeCandidates)

        const wonBidIds = bidResults.filter(r => r.status === 'won').map(r => r.bidId)
        const lostBidIds = bidResults.filter(r => r.status === 'lost').map(r => r.bidId)
        if (wonBidIds.length) {
            await tx.transferBid.updateMany({
                where: { id: { in: wonBidIds } },
                data: { status: 'won', processedAt: now },
            })
        }
        if (lostBidIds.length) {
            await tx.transferBid.updateMany({
                where: { id: { in: lostBidIds } },
                data: { status: 'lost', processedAt: now },
            })
        }
        bidsProcessed += bidResults.length
        bidsWon += wonBidIds.length
        bidsLost += lostBidIds.length

        if (invalidatedClaimIds.length) {
            await tx.waiverClaim.updateMany({
                where: { id: { in: invalidatedClaimIds } },
                data: { status: 'lost', processedAt: now },
            })
            claimsKilled += invalidatedClaimIds.length
        }

        for (const win of playersWon) {
            if (win.playerToDropId !== null) {
                await tx.fantasyTeamPlayer.deleteMany({
                    where: { fantasyTeamId: win.fantasyTeamId, playerId: win.playerToDropId },
                })
            }
        }
        if (playersWon.length) {
            await tx.fantasyTeamPlayer.createMany({
                data: playersWon.map(w => ({
                    fantasyTeamId: w.fantasyTeamId,
                    playerId: w.playerId,
                    rosterSlot: 'RESERVE' as const,
                })),
            })
        }
        for (const [fantasyTeamId, amount] of Object.entries(fundsSpent)) {
            await tx.fantasyTeam.update({
                where: { id: fantasyTeamId },
                data: {fundsBalance: { decrement: amount } },
            })
        }

        playersWonByBid = new Set(playersWon.map(w => w.playerId))
    }

    // ====================== PHASE 2: Normal Waiver Claims (Post TFB roster state) ======================

    const pendingClaimsRaw = await tx.waiverClaim.findMany({
        where: { status: 'pending', fantasyTeam: { fantasyLeagueId: leagueId } },
        include: { fantasyTeam: { include: { players: true } } },
    })

    const bidLostClaimIds = pendingClaimsRaw.filter(c => playersWonByBid.has(c.playerToAddId)).map(c => c.id)
    if (bidLostClaimIds.length) {
        await tx.waiverClaim.updateMany({
            where: { id: { in: bidLostClaimIds } },
            data: { status: 'lost', processedAt: now },
        })
        claimsKilled += bidLostClaimIds.length
    }
    const pendingClaims = pendingClaimsRaw.filter(c => !playersWonByBid.has(c.playerToAddId))

    if (pendingClaims.length === 0) {
        return { bidsProcessed, bidsWon, bidsLost,
            claimsProcessed: 0,
            claimsWon: 0,
            claimsLost: claimsKilled,
            claimsInvalidated: 0
        }
    }

    const teamIds = Array.from(new Set(pendingClaims.map(c => c.fantasyTeamId)))
    const teamsInput: WaiverTeamInput[] = teamIds.map(teamId => {
        const team = pendingClaims.find(c => c.fantasyTeamId === teamId)!.fantasyTeam
        const nonIrPlayers = team.players.filter(p => p.rosterSlot !== 'IR')
        return {
            id: team.id,
            waiverPriority: waiverOrder.get(team.id) ?? Number.MAX_SAFE_INTEGER,
            rosterPlayerIds: nonIrPlayers.map(p => p.playerId),
            rosterSize: nonIrPlayers.length
        }
    })

    const claimsInput: WaiverClaimInput[] = pendingClaims.map(c => ({
        id: c.id,
        fantasyTeamId: c.fantasyTeamId,
        playerToAddId: c.playerToAddId,
        playerToDropId: c.playerToDropId,
        rank: c.rank,
    }))

    const { claimResults, finalTeamState } = resolveWaiverClaims(claimsInput, teamsInput)

    for (const teamId of teamIds) {
        const originalTeam = pendingClaims.find(c => c.fantasyTeamId === teamId)!.fantasyTeam
        const originalNonIrIds = new Set(
            originalTeam.players.filter(p => p.rosterSlot !== 'IR').map(p => p.playerId)
        )
        const finalIds = new Set(finalTeamState[teamId].rosterPlayerIds)

        const added = Array.from(finalIds).filter(id => !originalNonIrIds.has(id))
        const removed = Array.from(originalNonIrIds).filter(id => !finalIds.has(id))

        if (removed.length) {
            await tx.fantasyTeamPlayer.deleteMany({
                where: { fantasyTeamId: teamId, playerId: { in: removed } },
            })
        }
        if (added.length) {
            await tx.fantasyTeamPlayer.createMany({
                data: added.map(playerId => ({ fantasyTeamId: teamId, playerId, rosterSlot: 'RESERVE' as const })),
            })
        }
    }

    for (const status of ['won', 'lost', 'invalidated'] as const) {
        const ids = claimResults.filter(r => r.status === status).map(r => r.claimId)
        if (ids.length) {
            await tx.waiverClaim.updateMany({
                where: { id: { in: ids } },
                data: { status, processedAt: now },
            })
        }
    }

    return {
        bidsProcessed,
        bidsWon,
        bidsLost,
        claimsProcessed: claimResults.length,
        claimsWon: claimResults.filter(r => r.status === 'won').length,
        claimsLost: claimResults.filter(r => r.status === 'lost').length + claimsKilled,
        claimsInvalidated: claimResults.filter(r => r.status === 'invalidated').length
    }
}