import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tribeId, name } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Verify ownership
    const tribe = await prisma.survivorFantasyLeagueTribe.findFirst({
      where: { id: tribeId, userId: user.id }
    })
    if (!tribe) return NextResponse.json({ error: 'Tribe not found' }, { status: 404 })

    await prisma.survivorFantasyLeagueTribe.update({
      where: { id: tribeId },
      data: { name: name.trim() }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[tribe-rename] error:', err)
    return NextResponse.json({ error: 'Failed to rename tribe' }, { status: 500 })
  }
}