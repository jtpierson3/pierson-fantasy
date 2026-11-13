import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

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