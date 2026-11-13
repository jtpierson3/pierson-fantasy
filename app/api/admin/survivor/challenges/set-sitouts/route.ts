import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        const { challengeId, contestantIds } = await req.json()

        // Delete existing sit-outs and replace
        await prisma.sitOut.deleteMany({ where: { challengeId } })

        if (contestantIds?.length > 0) {
            await prisma.sitOut.createMany({
                data: contestantIds.map((contestantId: string) => ({
                    challengeId,
                    contestantId,
                }))
            })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[set-sitouts] error:', err)
        return NextResponse.json({ error: 'Failed to save sit-outs' }, { status: 500 })
    }
}