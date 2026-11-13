import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        const currentUser = authResult.user

        const { transferId } = await req.json()

        const transfer = await prisma.playerTransfer.findUnique({ where: { id: transferId } })
        if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
        
        const dismissed = await prisma.playerTransfer.updateMany({
            where: { id: transferId, status: 'pending_review' },
            data: {
                status: 'dismissed',
                reviewedAt: new Date(),
                reviewedByUserId: currentUser.id,
            },
        })
        if (dismissed.count === 0) {
            return NextResponse.json({ error: 'This transfer has already been reviewed' }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[admin/transfers/dismiss] error: ', err)
        return NextResponse.json({ error: 'Failed to dismiss transfer' }, { status: 500 })
    }
}