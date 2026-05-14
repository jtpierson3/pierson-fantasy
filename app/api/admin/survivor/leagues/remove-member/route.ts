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