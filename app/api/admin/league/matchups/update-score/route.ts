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

        const { matchupId, homePoints, awayPoints } = await req.json()

        await prisma.fantasyMatchup.update({
            where: { id: matchupId },
            data: { homePoints, awayPoints }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[update-score] error:', err)
        return NextResponse.json({ error: 'Failed to update score' }, { status: 500 })
    }
}