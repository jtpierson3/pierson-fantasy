import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser?.isSiteAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tribeId, name, color } = await req.json()

    await prisma.tribe.update({
      where: { id: tribeId },
      data: { name, color }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[update-tribe] error:', err)
    return NextResponse.json({ error: 'Failed to update tribe' }, { status: 500 })
  }
}