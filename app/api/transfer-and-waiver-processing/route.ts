import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { isWaiverWindowClosed } from '@/lib/waiverWindow'
import { resolveTransferBids, type TransferBidInput, type TransferBidTeamInput } from '@/lib/transferBidResolution'
import { findCascadeInvalidations, type PendingClaimLike } from '@/lib/transferCascade'
import { resolveWaiverClaims, type WaiverClaimInput, type WaiverTeamInput } from '@/lib/fixtureTiming'

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
    // ================== PHASE 1: Transfer Fund Bids ===========================

    const pendingBids = await prisma.transferBid.findMany({
        where: { status: 'pending', fantasyTeam: { fantasyLeagueId: leagueId } },
        include: { fantasyTeam: true } 
    })

    const bidTeamsSummary = []
    let bidsProcessed = 0
    let bidsWon = 0
    let bidsLost = 0

    if (pendingBids.length > 0) {
        // Get standings for tie-breaking (worst record = lowest rank number = wins ties )
        const allTeams = await prisma.fantasyTeam.findMany({
            where: { fantasyLeagueId: leagueId },
            select: { id: true, totalLeaguePoints: true, totalFantasyPoints: true }
        })
        const standingsSorted = [...allTeams].sort((a, b) => {
            if (a.totalLeaguePoints !== b.totalLeaguePoints) return a.totalLeaguePoints - b.totalLeaguePoints
            return a.totalFantasyPoints - b.totalFantasyPoints
        })
        const rankMap = new Map(standingsSorted.map((t, i) => [t.id, 1 + 1]))

        const bidInputs: TransferBidInput[] = pendingBids.map(b => ({
            id: b.id,
            fantasyTeamId: b.fantasyTeamId,
            playerId: b.playerId,
            amount: b.amount,
            playerToDropId: b.playerToDropId
        }))
        const teamInputs: TransferBidTeamInput[] = allTeams.map(t => ({
            id: t.id,
            standingsRank: rankMap.get(t.id) ?? Infinity
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

        bidTeamsSummary.push({ won: bidsWon, lost: bidsLost })
    }

    // ====================== PHASE 2: Normal Waiver Claims (Post TFB roster state) ======================

    const pendingClaims = await prisma.waiverClaim.findMany({
        where: { status: 'pending', fantasyTeam: { fantasyLeagueId: leagueId } },
        include: { fantasyTeam: { include: { players: true } } }
    })

    if (pendingClaims.length === 0) {
        return { bidsProcessed, bidsWon, bidsLost, claimsProcessed: 0, claimsWon: 0, claimsLost: 0, claimsInvalidated: 0 }
    }

    const teamIds = Array.from(new Set(pendingClaims.map(c => c.fantasyTeamId)))
    const teamsInput: WaiverTeamInput[] = teamIds.map(teamId => {
        const team = pendingClaims.find(c => c.fantasyTeamId === teamId)!.fantasyTeam
        const nonIrPlayers = team.players.filter(p => p.rosterSlot !== 'IR')
        return {
            id: team.id,
            waiverPriority: team.waiverPriority,
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

        if (finalTeamState[teamId].waiverPriority !== originalTeam.waiverPriority) {
            await prisma.fantasyTeam.update({
                where: { id: teamId },
                data: { waiverPriority: finalTeamState[teamId].waiverPriority }
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
        claimsLost: claimResults.filter(r => r.status === 'lost').length,
        claimsInvalidated: claimResults.filter(r => r.status === 'invalidated').length
    }
}