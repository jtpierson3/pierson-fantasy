import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { tribalCouncilId } = await req.json()

    await prisma.votingRecord.deleteMany({ where: { tribalCouncilId } })
    await prisma.tribalCouncil.delete({ where: { id: tribalCouncilId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-tribal] error:', err)
    return NextResponse.json({ error: 'Failed to delete tribal council' }, { status: 500 })
  }
}