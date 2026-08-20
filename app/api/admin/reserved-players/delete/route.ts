import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { playerId } = await req.json()

    if (playerId >= 0) {
        return NextResponse.json({ error: 'Can only delete reserved (negative-id) players' }, { status: 400 })
    }

    try {
        await prisma.$transaction(async tx => {
            await tx.fantasyTeamPlayer.deleteMany({ where: { playerId } })
            await tx.waiverClaim.updateMany({ where: { playerToAddId: playerId }, data: { status: 'lost' } })
            await tx.player.delete({ where: { id: playerId } })
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[reserved-players/delete] error: ', err)
        return NextResponse.json({ error: 'Failed to delete reserved player' }, { status: 500 })
    }
}