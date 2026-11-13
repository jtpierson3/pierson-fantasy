import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function GET() {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const seasons = await prisma.survivorSeason.findMany({
      include: {
        scoringEvents: {
          orderBy: [{ category: 'asc' }, { label: 'asc' }]
        }
      },
      orderBy: { number: 'desc' }
    })

    return NextResponse.json({ seasons })
  } catch (err) {
    console.error('[scoring-seasons] error:', err)
    return NextResponse.json({ error: 'Failed to fetch seasons' }, { status: 500 })
  }
}