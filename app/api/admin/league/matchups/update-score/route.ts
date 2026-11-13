import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        const { matchupId, homePoints, awayPoints } = await req.json()

        await prisma.fantasyMatchup.update({
            where: { id: matchupId },
            data: { homePoints, awayPoints }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[update-score] error:', err)
        return NextResponse.json({ error: 'Failed to update score' }, { status: 500 })
    }
}