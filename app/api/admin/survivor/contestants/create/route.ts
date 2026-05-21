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
      seasonId, survivorPlayerId, newPlayerName, newPlayerBio,
      newPlayerBirthDate, status, placement, eliminatedEpisode, daysLasted,
      tribeId, swapEpisodeId, imageUrl, hometown, occupation, profile, description
    } = await req.json()

    let playerId = survivorPlayerId

    // Create new player if needed
    if (!playerId && newPlayerName) {
      const newPlayer = await prisma.survivorPlayer.create({
        data: { 
          name: newPlayerName,
          bio: newPlayerBio || null,
          birthDate: newPlayerBirthDate ? new Date(newPlayerBirthDate) : null
        }
      })
      playerId = newPlayer.id
    }

    if (playerId && (newPlayerBio || newPlayerBirthDate)) {
      await prisma.survivorPlayer.update({
        where: { id: playerId },
        data: {
          bio: newPlayerBio || undefined,
          birthDate: newPlayerBirthDate ? new Date(newPlayerBirthDate) : undefined
        }
      })
    }

    if (!playerId) return NextResponse.json({ error: 'Player is required' }, { status: 400 })

    const contestant = await prisma.contestant.create({
      data: {
        survivorPlayerId: playerId,
        survivorSeasonId: seasonId,
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

    // Add tribe membership if provided
    if (tribeId) {
      await prisma.tribeMembership.create({
        data: {
          contestantId: contestant.id,
          tribeId,
          tribeType: swapEpisodeId ? 'swap' : 'starting',
          isCurrent: true,
          episodeId: swapEpisodeId || null
        }
      })
    }

    return NextResponse.json({ success: true, contestant })
  } catch (err) {
    console.error('[create-contestant] error:', err)
    return NextResponse.json({ error: 'Failed to create contestant' }, { status: 500 })
  }
}