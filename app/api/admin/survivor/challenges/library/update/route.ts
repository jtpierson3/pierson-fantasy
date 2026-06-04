import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const currentUser = await prisma.user.findUnique({ where: { clerkId } })
        if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401})

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