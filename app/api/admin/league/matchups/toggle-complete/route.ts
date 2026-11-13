import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        const { matchupId, isComplete } = await req.json()

        await prisma.fantasyMatchup.update({
            where: { id: matchupId },
            data: { isComplete }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[toggle-complete] error:', err)
        return NextResponse.json({ error: 'Failed to update completion' }, { status: 500 })
    }
}