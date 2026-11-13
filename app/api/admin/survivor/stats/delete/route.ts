import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { statId } = await req.json()
    await prisma.episodeStat.delete({ where: { id: statId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-stat] error:', err)
    return NextResponse.json({ error: 'Failed to delete stat' }, { status: 500 })
  }
}