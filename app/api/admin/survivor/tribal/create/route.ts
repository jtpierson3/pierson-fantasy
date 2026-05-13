import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { episodeId, order, isFiremaking, notes } = await req.json()

    const tribal = await prisma.tribalCouncil.create({
      data: { episodeId, order, isFiremaking, notes: notes || null }
    })

    return NextResponse.json({ success: true, tribal })
  } catch (err) {
    console.error('[create-tribal] error:', err)
    return NextResponse.json({ error: 'Failed to create tribal council' }, { status: 500 })
  }
}