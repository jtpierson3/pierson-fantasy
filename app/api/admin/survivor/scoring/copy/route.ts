import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { toSeasonId, eventIds } = await req.json()

    // Fetch the source events
    const sourceEvents = await prisma.scoringEvent.findMany({
      where: { id: { in: eventIds } }
    })

    // Create copies for the target season
    await prisma.scoringEvent.createMany({
      data: sourceEvents.map(event => ({
        label: event.label,
        points: event.points,
        category: event.category,
        survivorSeasonId: toSeasonId,
      }))
    })

    return NextResponse.json({ success: true, copied: sourceEvents.length })
  } catch (err) {
    console.error('[copy-scoring] error:', err)
    return NextResponse.json({ error: 'Failed to copy scoring events' }, { status: 500 })
  }
}