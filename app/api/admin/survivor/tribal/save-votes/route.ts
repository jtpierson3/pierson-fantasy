import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tribalCouncilId, votes, eliminatedId } = await req.json()

    // Clear existing votes
    await prisma.votingRecord.deleteMany({ where: { tribalCouncilId } })

    // Create new votes
    if (votes.length > 0) {
      await prisma.votingRecord.createMany({
        data: votes.map(({ voterId, votedForId }: { voterId: string; votedForId: string }) => ({
          tribalCouncilId,
          voterId,
          votedForId,
          isRevoked: false,
        }))
      })
    }

    // Update eliminated
    await prisma.tribalCouncil.update({
      where: { id: tribalCouncilId },
      data: { eliminatedId: eliminatedId || null }
    })

    // If eliminated, update contestant status
    if (eliminatedId) {
      await prisma.contestant.update({
        where: { id: eliminatedId },
        data: { status: 'eliminated' }
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[save-votes] error:', err)
    return NextResponse.json({ error: 'Failed to save votes' }, { status: 500 })
  }
}