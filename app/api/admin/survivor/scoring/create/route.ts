import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { seasonId, label, points, category } = await req.json()

    const event = await prisma.scoringEvent.create({
      data: { survivorSeasonId: seasonId, label, points, category }
    })

    return NextResponse.json({ success: true, event })
  } catch (err) {
    console.error('[create-scoring] error:', err)
    return NextResponse.json({ error: 'Failed to create scoring event' }, { status: 500 })
  }
}