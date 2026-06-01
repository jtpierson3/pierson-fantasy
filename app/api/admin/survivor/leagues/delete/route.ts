import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId } = await req.json()

    // Delete in order
    await prisma.eliminationPick.deleteMany({ where: { surivovrLeagueId: leagueId } })

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