import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { leagueId, userId } = await req.json()

    // Check already a member
    const existing = await prisma.survivorFantasyLeagueMember.findFirst({
      where: { userId, survivorLeagueId: leagueId }
    })
    if (existing) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Add member
    await prisma.survivorFantasyLeagueMember.create({
      data: {
        userId,
        survivorLeagueId: leagueId,
        isAdmin: false,
      }
    })

    // Create their tribe automatically
    await prisma.survivorFantasyLeagueTribe.create({
      data: {
        name: `${user.username}'s Tribe`,
        userId,
        survivorLeagueId: leagueId,
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[add-survivor-member] error:', err)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}