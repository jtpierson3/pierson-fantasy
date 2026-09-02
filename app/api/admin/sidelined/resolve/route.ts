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

        const row = await prisma.sidelined.findUnique({ where: { id }, select: { id: true } })
        if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        await prisma.sidelined.update({ where: { id }, data: { completed: true } })
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[admin/sidelined/resolve] error:', err)
        return NextResponse.json({ error: 'Failed to resolve entry' }, { status: 500 })
    }
}