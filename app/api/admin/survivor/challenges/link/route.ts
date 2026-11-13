import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        const { challengeId, survivorChallengeId } = await req.json()

        await prisma.challenge.update({
            where: { id: challengeId },
            data: { survivorChallengeId: survivorChallengeId || null }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[challenge-link] error:', err)
        return NextResponse.json({ error: 'Failed to link challenge' }, { status: 500 })
    }
}