import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { challengeId } = await req.json()

    await prisma.challengeResult.deleteMany({ where: { challengeId } })
    await prisma.challengeTeam.deleteMany({ where: { challengeId } })
    await prisma.challenge.delete({ where: { id: challengeId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-challenge] error:', err)
    return NextResponse.json({ error: 'Failed to delete challenge' }, { status: 500 })
  }
}