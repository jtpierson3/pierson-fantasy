import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeagueAdminOf } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const { leagueId, name, description } = await req.json()

        const authResult = await requireLeagueAdminOf(leagueId)
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        await prisma.fantasyLeague.update({
            where: { id: leagueId },
            data: { name, description: description || null }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[update-league] error: ', err)
        return NextResponse.json({ error: 'Failed to update league' }, { status: 500})
    }
}