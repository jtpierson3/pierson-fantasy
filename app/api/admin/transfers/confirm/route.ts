import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

class AlreadyReviewedError extends Error {}

export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        const { user: currentUser } = authResult

        const { transferId, confirmedAmount } = await req.json()
        if (typeof transferId !== 'string') {
            return NextResponse.json({ error: 'transferId is required' }, { status: 400 })
        }

        const transfer = await prisma.playerTransfer.findUnique({ where: { id: transferId } })
        if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })

        const amount =
            typeof confirmedAmount === 'number' && Number.isFinite(confirmedAmount) && confirmedAmount >= 0
                ? confirmedAmount
                : (transfer.suggestedAmount ?? 0)

        await prisma.$transaction(async tx => {
            const claimed = await tx.playerTransfer.updateMany({
                where: { id: transferId, status: 'pending_review' },
                data: {
                    status: 'confirmed',
                    confirmedAmount: amount,
                    reviewedAt: new Date(),
                    reviewedByUserId: currentUser.id,
                },
            })
            if (claimed.count === 0) throw new AlreadyReviewedError()

            if (transfer.formerFantasyTeamId) {
                await tx.fantasyTeam.update({
                    where: { id: transfer.formerFantasyTeamId },
                    data: { fundsBalance: { increment: amount } },
                })
                await tx.fantasyTeamPlayer.deleteMany({
                    where: { fantasyTeamId: transfer.formerFantasyTeamId, playerId: transfer.playerId },
                })
            }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof AlreadyReviewedError) {
            return NextResponse.json({ error: 'This transfer has already been reviewed' }, { status: 400 })
        }
        console.error('[admin/transfers/confirm] error: ', err)
        return NextResponse.json({ error: 'Failed to confirm transfer' }, { status: 500 })
    }
}