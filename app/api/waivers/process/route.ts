import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isWaiverWindowClosed } from '@/lib/waiverWindow'
import { resolveWaiverClaims, type WaiverClaimInput, type WaiverTeamInput } from '@/lib/fixtureTiming'
import { env } from '@/lib/env'

export async function POST(req: Request) {
    //Protect this route the. same way sync routes are protected
    const authHeader = req.headers.get('authorization')
    if(authHeader !== `Bearer ${env.SYNC_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const windowClosed = await isWaiverWindowClosed()
        if (!windowClosed) {
            return NextResponse.json({ message: 'Waiver window is still open - nothing to process.' })
        }

        const leagues = await prisma.fantasyLeague.findMany({
            where: { draftComplete: true }
        })

        const results = []
        
        for (const league of leagues) {
            const pendingClaims = await prisma.waiverClaim.findMany({
                where: { status: 'pending', fantasyTeam: { fantasyLeagueId: league.id } },
                include: { fantasyTeam: { include: { players: true } } }
            })

            if (pendingClaims.length === 0) {
                results.push({ leagueId: league.id, processed: 0 })
                continue
            }

            const teamIds = Array.from(new Set(pendingClaims.map(c => c.fantasyTeamId)))
            const teamsInput: WaiverTeamInput[] = teamIds.map(teamId => {
                const team = pendingClaims.find(c => c.fantasyTeamId === teamId)!.fantasyTeam
                const nonIrPlayers = team.players.filter(p => p.rosterSlot !== 'IR')
                return {
                    id: team.id,
                    waiverPriority: team.waiverPriority,
                    rosterPlayerIds: nonIrPlayers.map(p => p.playerId),
                    rosterSize: nonIrPlayers.length,
                }
            })

            const claimsInput: WaiverClaimInput[] = pendingClaims.map(c => ({
                id: c.id,
                fantasyTeamId: c.fantasyTeamId,
                playerToAddId: c.playerToAddId,
                playerToDropId: c.playerToDropId,
                rank: c.rank
            }))

            const { claimResults, finalTeamState } = resolveWaiverClaims(claimsInput, teamsInput)

            // Persist roster changes
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

            // Persist claim statuses
            for (const result of claimResults) {
                await prisma.waiverClaim.update({
                    where: { id: result.claimId },
                    data: { status: result.status, processedAt: new Date() }
                })
            }

            results.push({
                leagueId: league.id,
                processed: claimResults.length,
                won: claimResults.filter(r => r.status === 'won').length,
                lost: claimResults.filter(r => r.status === 'lost').length,
                invalidated: claimResults.filter(r => r.status === 'invalidated').length
            })
        }

        return NextResponse.json({ success: true, results })
    } catch (err) {
        console.error('[waivers/process] error:', err)
        return NextResponse.json({ error: 'Failed to process waivers' }, { status: 500 })
    }
}
