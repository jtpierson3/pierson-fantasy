import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, survivorSeasonId } = await req.json()
    if (!name || !survivorSeasonId) {
      return NextResponse.json({ error: 'Name and season are required' }, { status: 400 })
    }

    // Create league
    const league = await prisma.survivorLeague.create({
      data: { 
        name,
        survivorSeasonId
     }
    })

    // Add creator as admin member
    await prisma.survivorFantasyLeagueMember.create({
      data: {
        userId: currentUser.id,
        survivorLeagueId: league.id,
        isAdmin: true,
      }
    })

    // Create creator's tribe
    await prisma.survivorFantasyLeagueTribe.create({
      data: {
        name: `${currentUser.username}'s Tribe`,
        userId: currentUser.id,
        survivorLeagueId: league.id,
      }
    })

    return NextResponse.json({ success: true, league })
  } catch (err) {
    console.error('[create-survivor-league] error:', err)
    return NextResponse.json({ error: 'Failed to create league' }, { status: 500 })
  }
}