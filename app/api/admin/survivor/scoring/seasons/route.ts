import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const seasons = await prisma.survivorSeason.findMany({
      include: {
        scoringEvents: {
          orderBy: [{ category: 'asc' }, { label: 'asc' }]
        }
      },
      orderBy: { number: 'desc' }
    })

    return NextResponse.json({ seasons })
  } catch (err) {
    console.error('[scoring-seasons] error:', err)
    return NextResponse.json({ error: 'Failed to fetch seasons' }, { status: 500 })
  }
}