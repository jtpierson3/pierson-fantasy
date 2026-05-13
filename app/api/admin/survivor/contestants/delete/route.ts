import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contestantId } = await req.json()

    await prisma.episodeStat.deleteMany({ where: { contestantId } })
    await prisma.survivorPicks.deleteMany({ where: { contestantId } })
    await prisma.tribeMembership.deleteMany({ where: { contestantId } })
    await prisma.contestant.delete({ where: { id: contestantId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-contestant] error:', err)
    return NextResponse.json({ error: 'Failed to delete contestant' }, { status: 500 })
  }
}