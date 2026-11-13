import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

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