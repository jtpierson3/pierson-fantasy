import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { reservedPlayerId, realPlayerId } = await req.json()

    try {
        await prisma.$transaction(async tx => {
            // Reassign every reference from the reserved (negative-id) player
            // to the real (positive-id) player, then delete the reserved row
            await tx.fantasyTeamPlayer.updateMany({
                where: { playerId: reservedPlayerId },
                data: { playerId: realPlayerId }
            })
            await tx.gameweekLineupPlayer.updateMany({
                where: { playerId: reservedPlayerId },
                data: { playerId: realPlayerId}
            })
            await tx.waiverClaim.updateMany({ 
                where: { playerToAddId: reservedPlayerId },
                data: { playerToAddId: realPlayerId }
            })
            await tx.waiverClaim.updateMany({
                where: { playerToDropId: reservedPlayerId },
                data: { playerToDropId: realPlayerId }
            })
            await tx.player.delete({ where: { id: reservedPlayerId } })
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[reserved-playeres/merge] error:', err)
        return NextResponse.json({ error: 'Failed to merge players' }, { status: 500 })
    }
}