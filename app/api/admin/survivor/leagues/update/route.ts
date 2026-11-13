import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { leagueId, name } = await req.json()

    await prisma.survivorLeague.update({
      where: { id: leagueId },
      data: { name }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[update-survivor-league] error:', err)
    return NextResponse.json({ error: 'Failed to update league' }, { status: 500 })
  }
}