import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tribeId, contestantIds } = await req.json()

    if (!Array.isArray(contestantIds) || contestantIds.length !== 6) {
      return NextResponse.json({ error: 'You must pick exactly 6 contestants' }, { status: 400 })
    }

    // Verify tribe belongs to user
    const tribe = await prisma.survivorFantasyLeagueTribe.findFirst({
      where: { id: tribeId, userId: user.id },
      include: {
        survivorLeague: {
          include: {
            survivorSeason: {
              include: {
                episodes: {
                  orderBy: { number: 'asc' },
                  take: 1,
                }
              }
            }
          }
        }
      }
    })

    if (!tribe) return NextResponse.json({ error: 'Tribe not found' }, { status: 404 })

    // Check picks aren't locked
    const firstEpisode = tribe.survivorLeague.survivorSeason.episodes[0]
    if (firstEpisode?.isAired) {
      return NextResponse.json({ error: 'Picks are locked — season has started' }, { status: 400 })
    }

    // Delete existing picks and create new ones
    await prisma.survivorPicks.deleteMany({ where: { tribeId } })
    await prisma.survivorPicks.createMany({
      data: contestantIds.map((contestantId: string) => ({
        tribeId,
        contestantId,
      }))
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[tribe-picks] error:', err)
    return NextResponse.json({ error: 'Failed to save picks' }, { status: 500 })
  }
}