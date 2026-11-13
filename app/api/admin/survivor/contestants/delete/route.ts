import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { contestantId } = await req.json()

    await prisma.episodeStat.deleteMany({ where: { contestantId } })
    await prisma.survivorPicks.deleteMany({ where: { contestantId } })
    await prisma.tribeMembership.deleteMany({ where: { contestantId } })
    await prisma.contestant.delete({ where: { id: contestantId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-contestant] error:', err)
    return NextResponse.json({ error: 'Failed to delete contestant' }, { status: 500 })
  }
}