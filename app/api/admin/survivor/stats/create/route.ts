import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { episodeId, eventId, contestantIds, description, order } = await req.json()

    let resolvedOrder= order

    if (!resolvedOrder) {
      const maxOrder = await prisma.episodeStat.findFirst({
        where: { episodeId },
        orderBy: { order: 'desc' },
        select: { order: true }
      })

      resolvedOrder = (maxOrder?.order ?? 0) + 1
    }

    await prisma.episodeStat.createMany({
      data: contestantIds.map((contestantId: string) => ({
        episodeId,
        contestantId,
        eventId,
        description: description || null,
        order: resolvedOrder,
      }))
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[create-stat] error:', err)
    return NextResponse.json({ error: 'Failed to create stat' }, { status: 500 })
  }
}