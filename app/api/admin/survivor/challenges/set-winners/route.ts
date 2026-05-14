import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { challengeId, contestantIds, winningTeamId } = await req.json()

    // Clear existing results
    await prisma.challengeResult.deleteMany({ where: { challengeId } })

    if (contestantIds?.length) {
      // Individual winners
      await prisma.challengeResult.createMany({
        data: contestantIds.map((contestantId: string, index: number) => ({
          challengeId,
          contestantId,
          placement: index + 1,
        }))
      })
    } else if (winningTeamId) {
      // Team winner
      await prisma.challengeResult.create({
        data: {
          challengeId,
          teamId: winningTeamId,
          placement: 1,
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[set-winners] error:', err)
    return NextResponse.json({ error: 'Failed to set winners' }, { status: 500 })
  }
}