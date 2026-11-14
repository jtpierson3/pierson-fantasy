import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireUser()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    const user = authResult.user

    const { tribeId, name } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Verify ownership
    const tribe = await prisma.survivorFantasyLeagueTribe.findFirst({
      where: { id: tribeId, userId: user.id }
    })
    if (!tribe) return NextResponse.json({ error: 'Tribe not found' }, { status: 404 })

    await prisma.survivorFantasyLeagueTribe.update({
      where: { id: tribeId },
      data: { name: name.trim() }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[tribe-rename] error:', err)
    return NextResponse.json({ error: 'Failed to rename tribe' }, { status: 500 })
  }
}