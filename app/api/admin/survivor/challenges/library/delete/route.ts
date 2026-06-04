import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const currentUser = await prisma.user.findUnique({ where: { clerkId } })
        if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401})

        const { survivorChallengeId } = await req.json()

        // Unlink all challenge first
        await prisma.challenge.updateMany({
            where: { survivorChallengeId },
            data: { survivorChallengeId: null}
        })

        await prisma.survivorChallenge.delete({
            where: { id: survivorChallengeId }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[challenge-library-delete] error:', err)
        return NextResponse.json({ error: 'Failed to delete challenge' }, { status: 500 })
    }
}