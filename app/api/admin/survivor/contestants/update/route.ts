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
      daysLasted, tribeId, imageUrl, hometown, occupation,
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

    // Update tribe membership
    if (tribeId) {
      await prisma.tribeMembership.updateMany({
        where: { contestantId, isCurrent: true },
        data: { isCurrent: false }
      })
      await prisma.tribeMembership.create({
        data: {
          contestantId,
          tribeId,
          tribeType: 'current',
          isCurrent: true,
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[update-contestant] error:', err)
    return NextResponse.json({ error: 'Failed to update contestant' }, { status: 500 })
  }
}