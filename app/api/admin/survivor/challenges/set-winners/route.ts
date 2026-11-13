import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { challengeId, contestantIds, participantIds, useAllParticipants, winningTeamId, runnerUpTeamId } = await req.json()

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

      // store runner-up team
      if (runnerUpTeamId) {
        await prisma.challengeResult.create({
          data: {
            challengeId,
            teamId: runnerUpTeamId,
            placement: 2,
          }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[set-winners] error:', err)
    return NextResponse.json({ error: 'Failed to set winners' }, { status: 500 })
  }
}