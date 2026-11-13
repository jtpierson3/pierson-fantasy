import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { leagueId, userId } = await req.json()

    // Get tribe first
    const tribe = await prisma.survivorFantasyLeagueTribe.findFirst({
      where: { userId, survivorLeagueId: leagueId }
    })

    if (tribe) {
      await prisma.survivorPicks.deleteMany({ where: { tribeId: tribe.id } })
      await prisma.survivorFantasyLeagueTribe.delete({ where: { id: tribe.id } })
    }

    await prisma.survivorFantasyLeagueMember.deleteMany({
      where: { userId, survivorLeagueId: leagueId }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[remove-survivor-member] error:', err)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}