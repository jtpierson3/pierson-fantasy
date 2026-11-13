import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { leagueId } = await req.json()

    // Delete in order
    await prisma.eliminationPick.deleteMany({ where: { survivorLeagueId: leagueId } })

    const tribes = await prisma.survivorFantasyLeagueTribe.findMany({
      where: { survivorLeagueId: leagueId }
    })

    for (const tribe of tribes) {
      await prisma.survivorPicks.deleteMany({ where: { tribeId: tribe.id } })
    }

    await prisma.survivorFantasyLeagueTribe.deleteMany({
      where: { survivorLeagueId: leagueId }
    })
    await prisma.survivorFantasyLeagueMember.deleteMany({
      where: { survivorLeagueId: leagueId }
    })
    await prisma.survivorLeague.delete({ where: { id: leagueId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-survivor-league] error:', err)
    return NextResponse.json({ error: 'Failed to delete league' }, { status: 500 })
  }
}