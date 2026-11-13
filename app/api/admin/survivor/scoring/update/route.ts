import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { eventId, label, points, category } = await req.json()

    await prisma.scoringEvent.update({
      where: { id: eventId },
      data: { label, points, category }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[update-scoring] error:', err)
    return NextResponse.json({ error: 'Failed to update scoring event' }, { status: 500 })
  }
}