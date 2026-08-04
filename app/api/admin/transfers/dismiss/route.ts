import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const currentUser = await prisma.user.findUnique({ where: { clerkId } })
        if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { transferId } = await req.json()

        const transfer = await prisma.playerTransfer.findUnique({ where: { id: transferId } })
        if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
        if (transfer.status !== 'pending_review') {
            return NextResponse.json({ error: 'This transfer has already been reviewed' }, { status: 400 })
        }

        await prisma.playerTransfer.update({
            where: { id : transferId },
            data: {
                status: 'dismissed',
                reviewedAt: new Date(),
                reviewedByUserId: currentUser.id
            }
        })

        return NextResponse.json({ success: true })

    } catch (err) {
        console.error('[admin/transfers/dismiss] error: ', err)
        return NextResponse.json({ error: 'Failed to dismiss transfer' }, { status: 500 })
    }
}