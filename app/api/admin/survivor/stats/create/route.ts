import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { episodeId, eventId, contestantIds, description, order } = await req.json()

    let resolvedOrder= order

    if (!resolvedOrder) {
      const maxOrder = await prisma.episodeStat.findFirst({
        where: { episodeId },
        orderBy: { order: 'desc' },
        select: { order: true }
      })

      let order = (maxOrder?.order ?? 0) + 1
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