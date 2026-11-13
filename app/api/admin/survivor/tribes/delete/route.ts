import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { tribeId } = await req.json()

    await prisma.tribeMembership.deleteMany({ where: { tribeId } })
    await prisma.tribe.delete({ where: { id: tribeId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-tribe] error:', err)
    return NextResponse.json({ error: 'Failed to delete tribe' }, { status: 500 })
  }
}