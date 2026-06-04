import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const {
      episodeId, name, type, isIndividual, isFiremaking,
      reward, order, survivorChallengeId, tribeIds, customTeams
    } = await req.json()

    const challenge = await prisma.challenge.create({
      data: {
        episodeId,
        name: name || null,
        type,
        isIndividual,
        isFiremaking,
        reward: reward || null,
        order,
        survivorChallengeId: survivorChallengeId || null
      }
    })

    // Create teams from existing tribes
    if (!isIndividual && tribeIds?.length) {
      for (const tribeId of tribeIds) {
        const tribe = await prisma.tribe.findUnique({
          where: { id: tribeId },
          include: {
            memberships: {
              where: { isCurrent: true },
              include: { contestant: true }
            }
          }
        })

        if (tribe) {
          await prisma.challengeTeam.create({
            data: {
              challengeId: challenge.id,
              name: tribe.name,
              color: tribe.color,
              contestants: {
                connect: tribe.memberships.map(m => ({ id: m.contestantId }))
              }
            }
          })
        }
      }
    }

    // Create custom teams
    if (!isIndividual && customTeams?.length) {
      for (const team of customTeams) {
        await prisma.challengeTeam.create({
          data: {
            challengeId: challenge.id,
            name: team.name,
            color: team.color,
            contestants: {
              connect: team.contestantIds.map((id: string) => ({ id }))
            }
          }
        })
      }
    }

    return NextResponse.json({ success: true, challenge })
  } catch (err) {
    console.error('[create-challenge] error:', err)
    return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
  }
}