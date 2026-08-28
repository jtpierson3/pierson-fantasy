import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { isWaiverWindowClosed } from '@/lib/fixtureTiming'
import { resolveTransferBids, type TransferBidInput, type TransferBidTeamInput } from '@/lib/transferBidResolution'
import { findCascadeInvalidations, type PendingClaimLike } from '@/lib/transferCascade'
import { resolveWaiverClaims, type WaiverClaimInput, type WaiverTeamInput } from '@/lib/waiverClaimResolution'
import { getWaiverPriorityOrder } from '@/lib/waiverPriorityOrder'

export async function POST(req: Request) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${env.SYNC_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const windowClosed = await isWaiverWindowClosed()
        if (!windowClosed) {
            return NextResponse.json({ message: 'Window is still open - nothing to process' })
        }

        const leagues = await prisma.fantasyLeague.findMany({
            where: { draftComplete: true }
        })

        const results = []

        for (const league of leagues) {
            const result = await processLeague(league.id)
            results.push({ leagueId: league.id, ...result })
        }

        return NextResponse.json({ success: true, results })
    } catch (err) {
        console.error('[transfer-and-waiver-processing] error:', err)
        return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
    }
}

async function processLeague(leagueId: string) {
    let playersWonByBid = new Set<number>()
    let claimsKilledByBids = 0

    // Waiver-line order for the whole league, worst team first. Drives the transfer-bid
    // tie break and waiver-claim priority.
    const leagueTeams = await prisma.fantasyTeam.findMany({
        where: { fantasyLeagueId: leagueId },
        select: { id: true, totalLeaguePoints: true, totalFantasyPoints: true, draftPosition: true },
    })
    const waiverOrder = getWaiverPriorityOrder(leagueTeams)

    // ================== PHASE 1: Transfer Fund Bids ===========================

    const pendingBids = await prisma.transferBid.findMany({
        where: { status: 'pending', fantasyTeam: { fantasyLeagueId: leagueId } },
        include: { fantasyTeam: true } 
    })

    let bidsProcessed = 0
    let bidsWon = 0
    let bidsLost = 0

    if (pendingBids.length > 0) {
        const bidInputs: TransferBidInput[] = pendingBids.map(b => ({
            id: b.id,
            fantasyTeamId: b.fantasyTeamId,
            playerId: b.playerId,
            amount: b.amount,
            playerToDropId: b.playerToDropId
        }))
        const teamInputs: TransferBidTeamInput[] = leagueTeams.map(t => ({
            id: t.id,
            standingsRank: waiverOrder.get(t.id) ?? Infinity
        }))

        const { bidResults, winningDrops, fundsSpent, playersWon } = resolveTransferBids(bidInputs, teamInputs)

        // Cascade - check against other pending bids AND pending waiver claims for the same league
        const otherPendingClaims = await prisma.waiverClaim.findMany({
            where: { status: 'pending', fantasyTeam: { fantasyLeagueId: leagueId } }
        })

        const cascadeCandidates: PendingClaimLike[] = [
            ...pendingBids
                .filter(b => !bidResults.some(r => r.bidId === b.id && r.status === 'won'))
                .map(b => ({ id: `bid:${b.id}`, fantasyTeamId: b.fantasyTeamId, playerId: b.playerId, playerToDropId: b.playerToDropId })),
            ...otherPendingClaims.map(c => ({ id: `claim:${c.id}`, fantasyTeamId: c.fantasyTeamId, playerId: c.playerToAddId, playerToDropId: c.playerToDropId}))
        ]

        const { invalidatedClaimIds } = findCascadeInvalidations(winningDrops, cascadeCandidates)
        const invalidatedBidIds = new Set(
            invalidatedClaimIds.filter(id => id.startsWith('bid:')).map(id => id.replace('bid:', ''))
        )
        const invalidatedWaiverClaimIds = new Set(
            invalidatedClaimIds.filter(id => id.startsWith('claim:')).map(id => id.replace('claim:', ''))
        )

        playersWonByBid = new Set(
            playersWon
                .filter(w => !invalidatedBidIds.has(
                    pendingBids.find(b => b.fantasyTeamId === w.fantasyTeamId && b.playerId === w.playerId)?.id ?? ''
                ))
                .map(w => w.playerId)
        )
        claimsKilledByBids += invalidatedWaiverClaimIds.size

        // Persist Transfer Bid Results
        for (const result of bidResults) {
            const finalStatus = invalidatedBidIds.has(result.bidId) ? 'lost' : result.status
            await prisma.transferBid.update({
                where: { id: result.bidId },
                data: { status: finalStatus, processedAt: new Date() }
            })
            if (finalStatus === 'won') bidsWon++
            else bidsLost++
            bidsProcessed++ 
        }

        // Mark cascade invalidated waiver claims as lost too (they'll be excluded from phase 2)
        for (const claimId of invalidatedWaiverClaimIds) {
            await prisma.waiverClaim.update({
                where: { id: claimId },
                data: { status: 'lost', processedAt: new Date() }
            })
        }

        // Apply roster changes and fund deductions for winning bids
        for (const win of playersWon) {
            if (invalidatedBidIds.has(pendingBids.find(b => b.fantasyTeamId == win.fantasyTeamId && b.playerId === win.playerId)?.id ?? '')) {
                continue
            }

            if (win.playerToDropId) {
                await prisma.fantasyTeamPlayer.deleteMany({
                    where: { fantasyTeamId: win.fantasyTeamId, playerId: win.playerToDropId }
                })
            }
            await prisma.fantasyTeamPlayer.create({
                data: { fantasyTeamId: win.fantasyTeamId, playerId: win.playerId, rosterSlot: 'RESERVE' }
            })
        }

        for (const [fantasyTeamId, amount] of Object.entries(fundsSpent)) {
            await prisma.fantasyTeam.update({
                where: { id: fantasyTeamId },
                data: { fundsBalance: { decrement: amount } }
            })
        }
    }

    // ====================== PHASE 2: Normal Waiver Claims (Post TFB roster state) ======================
    const pendingClaimsRaw = await prisma.waiverClaim.findMany({
        where: { status: 'pending', fantasyTeam: { fantasyLeagueId: leagueId } },
        include: { fantasyTeam: { include: { players: true } } },
    })

    const bidLostClaimIds = pendingClaimsRaw.filter(c => playersWonByBid.has(c.playerToAddId)).map(c => c.id)
    if (bidLostClaimIds.length) {
        await prisma.waiverClaim.updateMany({
            where: { id: { in: bidLostClaimIds } },
            data: { status: 'lost', processedAt: new Date() },
        })
    }
    claimsKilledByBids += bidLostClaimIds.length
    const pendingClaims = pendingClaimsRaw.filter(c => !playersWonByBid.has(c.playerToAddId))

    if (pendingClaims.length === 0) {
        return { bidsProcessed, bidsWon, bidsLost, 
            claimsProcessed: 0, 
            claimsWon: 0, 
            claimsLost: claimsKilledByBids,
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

        for (const playerId of removed) {
            await prisma.fantasyTeamPlayer.deleteMany({ where: { fantasyTeamId: teamId, playerId } })
        }
        for (const playerId of added) {
            await prisma.fantasyTeamPlayer.create({
                data: { fantasyTeamId: teamId, playerId, rosterSlot: 'RESERVE' }
            })
        }
    }

    for (const result of claimResults) {
        await prisma.waiverClaim.update({
            where: { id: result.claimId },
            data: { status: result.status, processedAt: new Date() }
        })
    }

    return {
        bidsProcessed,
        bidsWon,
        bidsLost,
        claimsProcessed: claimResults.length,
        claimsWon: claimResults.filter(r => r.status === 'won').length,
        claimsLost: claimResults.filter(r => r.status === 'lost').length + claimsKilledByBids,
        claimsInvalidated: claimResults.filter(r => r.status === 'invalidated').length
    }
}