import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

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