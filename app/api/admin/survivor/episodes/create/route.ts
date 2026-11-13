import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { seasonId, number, name, airDate, isAired, isMerge, isFinale, description} = await req.json()

    const episode = await prisma.episode.create({
      data: {
        survivorSeasonId: seasonId,
        number,
        name,
        airDate: new Date(airDate),
        isAired,
        isMerge,
        isFinale,
        description
      }
    })

    return NextResponse.json({ success: true, episode })
  } catch (err) {
    console.error('[create-episode] error:', err)
    return NextResponse.json({ error: 'Failed to create episode' }, { status: 500 })
  }
}