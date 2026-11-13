import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

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