import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { episodeId, order, isFiremaking, isFinalTribal, notes } = await req.json()

    const tribal = await prisma.tribalCouncil.create({
      data: { episodeId, order, isFiremaking, isFinalTribal, notes: notes || null }
    })

    return NextResponse.json({ success: true, tribal })
  } catch (err) {
    console.error('[create-tribal] error:', err)
    return NextResponse.json({ error: 'Failed to create tribal council' }, { status: 500 })
  }
}