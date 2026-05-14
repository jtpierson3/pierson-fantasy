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

    const { leagueId, name } = await req.json()

    await prisma.survivorLeague.update({
      where: { id: leagueId },
      data: { name }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[update-survivor-league] error:', err)
    return NextResponse.json({ error: 'Failed to update league' }, { status: 500 })
  }
}