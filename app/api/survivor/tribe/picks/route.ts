import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/apiAuth'

const PICKS_REQUIRED = 6

export async function POST(req: Request) {
  try {
    const authResult = await requireUser()
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    const { user } = authResult

    const { tribeId, contestantIds } = await req.json()
    if (
      typeof tribeId !== 'string' ||
      !Array.isArray(contestantIds) ||
      !contestantIds.every((id): id is string => typeof id === 'string') ||
      contestantIds.length !== PICKS_REQUIRED ||
      new Set(contestantIds).size !== PICKS_REQUIRED
    ) {
      return NextResponse.json(
        { error: `You must pick exactly ${PICKS_REQUIRED} different contestants` },
        { status: 400 }
      )
    }

    const tribe = await prisma.survivorFantasyLeagueTribe.findFirst({
      where: { id: tribeId, userId: user.id },
      include: {
        survivorLeague: {
          include: {
            survivorSeason: {
              include: { episodes: { orderBy: { number: 'asc' }, take: 1 } },
            }
          }
        }
      }
    })
    if (!tribe) return NextResponse.json({ error: 'Tribe not found' }, { status: 404 })

    const firstEpisode = tribe.survivorLeague.survivorSeason.episodes[0]
    if (firstEpisode?.isAired) {
      return NextResponse.json({ error: 'Picks are locked — season has started' }, { status: 400 })
    }

    const inSeasonCount = await prisma.contestant.count({
      where: { id: { in: contestantIds }, survivorSeasonId: tribe.survivorLeague.survivorSeasonId },
    })
    if (inSeasonCount !== PICKS_REQUIRED) {
      return NextResponse.json({ error: 'One or more contestants are not in this season' }, { status: 400 })
    }

    // Delete existing picks and create new ones
    await prisma.$transaction([
      prisma.survivorPicks.deleteMany({ where: { tribeId } }),
      prisma.survivorPicks.createMany({
        data: contestantIds.map(contestantId => ({ tribeId, contestantId }))
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[tribe-picks] error:', err)
    return NextResponse.json({ error: 'Failed to save picks' }, { status: 500 })
  }
}