import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contestantId, status, placement, eliminatedEpisode,
      daysLasted, tribeId, swapEpisodeId, imageUrl, hometown, occupation,
      profile, description, newPlayerBio, newPlayerBirthDate
    } = await req.json()

    await prisma.contestant.update({
      where: { id: contestantId },
      data: {
        status,
        placement: placement ?? null,
        eliminatedEpisode: eliminatedEpisode ?? null,
        daysLasted: daysLasted ?? null,
        imageUrl: imageUrl ?? null,
        hometown: hometown ?? null,
        occupation: occupation ?? null,
        profile: profile ?? null,
        description: description ?? null,
      }
    })

    // Update Player Bio and BirthDate if provided
    const contestant = await prisma.contestant.findUnique({
      where: {id: contestantId},
      select: {survivorPlayerId: true}
    })

    if (contestant && (newPlayerBio !== undefined || newPlayerBirthDate !== undefined)) {
      await prisma.survivorPlayer.update({
        where: { id: contestant.survivorPlayerId },
        data: {
          bio: newPlayerBio || null,
          birthDate: newPlayerBirthDate ? new Date(newPlayerBirthDate) : null
        }
      })
    }

    const inactiveStatuses = ['eliminated', 'jury', 'medevac', 'quit', 'finalist', 'winner']

    //If contestant is no longer active mark all tribe memberships as inactive
    if (inactiveStatuses.includes(status)) {
      await prisma.tribeMembership.updateMany({
        where: { contestantId, isCurrent: true },
        data: { isCurrent: false }
      })
    }

    // Update tribe membership
    if (tribeId) {
      const currentMembership = await prisma.tribeMembership.findFirst({
        where: { contestantId, isCurrent: true}
      })

      const tribeChanged = currentMembership?.tribeId !== tribeId
      const episodeChanged = currentMembership?.episodeId !== swapEpisodeId

      if (tribeChanged  || (swapEpisodeId && episodeChanged)) {
        await prisma.tribeMembership.updateMany({
          where: { contestantId, isCurrent: true },
          data: { isCurrent: false }
        })
        await prisma.tribeMembership.create({
          data: {
            contestantId,
            tribeId,
            tribeType: swapEpisodeId ? 'swap' : 'starting',
            isCurrent: true,
            episodeId: swapEpisodeId || null
          }
        })
      }
      
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[update-contestant] error:', err)
    return NextResponse.json({ error: 'Failed to update contestant' }, { status: 500 })
  }
}