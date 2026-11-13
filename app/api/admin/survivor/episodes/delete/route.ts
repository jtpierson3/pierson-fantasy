import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { episodeId } = await req.json()

    await prisma.episodeStat.deleteMany({ where: { episodeId } })
    await prisma.episode.delete({ where: { id: episodeId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-episode] error:', err)
    return NextResponse.json({ error: 'Failed to delete episode' }, { status: 500 })
  }
}