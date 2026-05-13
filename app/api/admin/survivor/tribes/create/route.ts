import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { seasonId, name, color } = await req.json()

    const tribe = await prisma.tribe.create({
      data: { survivorSeasonId: seasonId, name, color }
    })

    return NextResponse.json({ success: true, tribe })
  } catch (err) {
    console.error('[create-tribe] error:', err)
    return NextResponse.json({ error: 'Failed to create tribe' }, { status: 500 })
  }
}