import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { challengeId } = await req.json()

    await prisma.sitOut.deleteMany({ where: { challengeId }})
    await prisma.challengeResult.deleteMany({ where: { challengeId } })
    await prisma.challengeTeam.deleteMany({ where: { challengeId } })
    await prisma.challenge.delete({ where: { id: challengeId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-challenge] error:', err)
    return NextResponse.json({ error: 'Failed to delete challenge' }, { status: 500 })
  }
}