import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { episodeId, number, name, airDate, isAired, isMerge, isFinale, description } = await req.json()

    await prisma.episode.update({
      where: { id: episodeId },
      data: { number, name, airDate: new Date(airDate), isAired, isMerge, isFinale, description }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[update-episode] error:', err)
    return NextResponse.json({ error: 'Failed to update episode' }, { status: 500 })
  }
}