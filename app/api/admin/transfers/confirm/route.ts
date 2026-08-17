import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        const { user: currentUser } = authResult

        const { transferId, confirmedAmount } = await req.json()

        const transfer = await prisma.playerTransfer.findUnique({
            where: { id: transferId }
        })
        if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
        if (transfer.status !== 'pending_review') {
            return NextResponse.json({ error: 'This transfer has already been reviewed' }, { status: 400 })
        }

        const amount = typeof confirmedAmount === 'number' ? confirmedAmount : (transfer.suggestedAmount ?? 0)

        await prisma.$transaction(async tx => {
            // Credit the ex-owner's fund balance, if they had one
            if (transfer.formerFantasyTeamId) {
                await tx.fantasyTeam.update({
                    where: { id: transfer.formerFantasyTeamId },
                    data: { fundsBalance: { increment: amount }}
                })

                // Drop the player from their roster, freeing the slot
                await tx.fantasyTeamPlayer.deleteMany({
                    where: {
                        fantasyTeamId: transfer.formerFantasyTeamId,
                        playerId: transfer.playerId
                    }
                })
            }

            await tx.playerTransfer.update({
                where: { id: transferId },
                data: {
                    status: 'confirmed',
                    confirmedAmount: amount,
                    reviewedAt: new Date(),
                    reviewedByUserId: currentUser.id
                }
            })
        })
        
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[admin/transfers/confirm] error:', err)
        return NextResponse.json({ error: 'Failed to confirm transfer' }, { status: 500})
    }
}