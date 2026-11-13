import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { eventId } = await req.json()

    await prisma.episodeStat.deleteMany({ where: { eventId } })
    await prisma.scoringEvent.delete({ where: { id: eventId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-scoring] error:', err)
    return NextResponse.json({ error: 'Failed to delete scoring event' }, { status: 500 })
  }
}