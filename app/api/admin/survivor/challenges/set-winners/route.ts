import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { challengeId, contestantIds, participantIds, useAllParticipants, winningTeamId } = await req.json()

    // Clear existing results
    await prisma.challengeResult.deleteMany({ where: { challengeId } })

    if (contestantIds?.length) {
      // Store winners as placement 1
      await prisma.challengeResult.createMany({
        data: contestantIds.map((contestantId: string) => ({
          challengeId,
          contestantId,
          placement: 1,
        }))
      })

      // Store specific non-winning participants as placement 2
      if (!useAllParticipants && participantIds?.length) {
        const nonWinners = participantIds.filter(
          (id: string) => !contestantIds.includes(id)
        )
        if (nonWinners.length > 0) {
          await prisma.challengeResult.createMany({
            data: nonWinners.map((contestantId: string) => ({
              challengeId,
              contestantId,
              placement: 2,
            }))
          })
        }
      }
    } else if (winningTeamId) {
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