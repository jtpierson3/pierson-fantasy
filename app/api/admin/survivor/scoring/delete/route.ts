import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventId } = await req.json()

    await prisma.episodeStat.deleteMany({ where: { eventId } })
    await prisma.scoringEvent.delete({ where: { id: eventId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-scoring] error:', err)
    return NextResponse.json({ error: 'Failed to delete scoring event' }, { status: 500 })
  }
}