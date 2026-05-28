import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthoized' }, { status: 401 })
        
        const currentUser = await prisma.user.findUnique({ where: { clerkId } })
        if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            
        const { challengeId, contestantIds } = await req.json()

        // Delete existing sit-outs and replace
        await prisma.sitOut.deleteMany({ where: { challengeId } })

        if (contestantIds?.length > 0) {
            await prisma.sitOut.createMany({
                data: contestantIds.map((contestantId: string) => ({
                    challengeId,
                    contestantId,
                }))
            })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[set-sitouts] error:', err)
        return NextResponse.json({ error: 'Failed to save sit-outs' }, { status: 500 })
    }
}