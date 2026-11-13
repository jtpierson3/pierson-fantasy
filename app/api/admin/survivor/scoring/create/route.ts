import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

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