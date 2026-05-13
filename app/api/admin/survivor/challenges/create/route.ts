import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { episodeId, name, type, isIndividual, isFiremaking, reward, order } = await req.json()

    const challenge = await prisma.challenge.create({
      data: { episodeId, name: name || null, type, isIndividual, isFiremaking, reward: reward || null, order }
    })

    return NextResponse.json({ success: true, challenge })
  } catch (err) {
    console.error('[create-challenge] error:', err)
    return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
  }
}