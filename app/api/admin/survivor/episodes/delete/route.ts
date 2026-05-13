import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { episodeId } = await req.json()

    await prisma.episodeStat.deleteMany({ where: { episodeId } })
    await prisma.episode.delete({ where: { id: episodeId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-episode] error:', err)
    return NextResponse.json({ error: 'Failed to delete episode' }, { status: 500 })
  }
}