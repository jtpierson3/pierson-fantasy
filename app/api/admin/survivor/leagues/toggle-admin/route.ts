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