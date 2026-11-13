import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { leagueId, userId, isAdmin } = await req.json()

    await prisma.survivorFantasyLeagueMember.updateMany({
      where: { userId, survivorLeagueId: leagueId },
      data: { isAdmin }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[toggle-survivor-admin] error:', err)
    return NextResponse.json({ error: 'Failed to update admin status' }, { status: 500 })
  }
}