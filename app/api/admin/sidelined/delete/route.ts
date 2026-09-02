import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeagueAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireLeagueAdmin()
        if (!authResult.ok) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }

        const { id } = await req.json()
        if (typeof id !== 'string') {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
        }

        const row = await prisma.sidelined.findUnique({ where: { id }, select: { source: true } })
        if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        if (row.source !== 'MANUAL') {
            return NextResponse.json({ error: 'Only manual entries can be deleted' }, { status: 403 })
        }

        await prisma.sidelined.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[admin/sidelined/delete]: error:', err)
        return NextResponse.json({ error: 'Failed to delete etnry' }, { status: 500 })
    }
}