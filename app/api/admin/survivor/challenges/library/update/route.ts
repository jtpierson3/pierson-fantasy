import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        const { survivorChallengeId, name, description } = await req.json()

        if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

        await prisma.survivorChallenge.update({
            where: { id: survivorChallengeId },
            data: {
                name: name.trim(),
                description: description || null
            }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[challenge-library-update] error:', err)
        return NextResponse.json({ error: 'Failed to update challenge' }, { status: 500 })
    }
}