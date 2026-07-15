import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const currentUser = await prisma.user.findUnique({ where: { clerkId } })
        if (!currentUser?.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { matchupId, isComplete } = await req.json()

        await prisma.fantasyMatchup.update({
            where: { id: matchupId },
            data: { isComplete }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[toggle-complete] error:', err)
        return NextResponse.json({ error: 'Failed to update completion' }, { status: 500 })
    }
}