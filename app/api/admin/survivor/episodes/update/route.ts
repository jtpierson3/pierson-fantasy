import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

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