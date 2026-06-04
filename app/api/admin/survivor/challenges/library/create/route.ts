import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const currentUser = await prisma.user.findUnique({ where: { clerkId } })
        if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { name, description } = await req.json()

        if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

        const challenge = await prisma.survivorChallenge.create({
            data: {
                name: name.trim(),
                description: description || null
            }
        })

        return NextResponse.json({ challenge })
    } catch (err) {
        console.error('[challenge-library-create] error:', err)
        return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
    }
}