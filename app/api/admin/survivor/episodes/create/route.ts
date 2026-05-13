import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { seasonId, number, name, airDate, isAired, isMerge, isFinale } = await req.json()

    const episode = await prisma.episode.create({
      data: {
        survivorSeasonId: seasonId,
        number,
        name,
        airDate: new Date(airDate),
        isAired,
        isMerge,
        isFinale,
      }
    })

    return NextResponse.json({ success: true, episode })
  } catch (err) {
    console.error('[create-episode] error:', err)
    return NextResponse.json({ error: 'Failed to create episode' }, { status: 500 })
  }
}