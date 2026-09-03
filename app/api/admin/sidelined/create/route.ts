import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeagueAdmin } from '@/lib/apiAuth'

const CATEGORIES = ['injury', 'suspended']

export async function POST(req: Request) {
    try {
        const authResult = await requireLeagueAdmin()
        if (!authResult.ok) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }

        const { playerId, category, typeName, startDate, endDate } = await req.json()

        if (typeof playerId !== 'number' || !CATEGORIES.includes(category) ||
            typeof typeName !== 'string' || !typeName.trim() || !startDate) 
        {
            return NextResponse.json({ error: 'Invalid Input' }, { status: 400 })
        }

        const start = new Date(startDate)
        const end = endDate ? new Date(endDate) : null
        if (isNaN(start.getTime()) || (end && isNaN(end.getTime()))) {
            return NextResponse.json({ error: 'Invalid Date' }, { status: 400 })
        }

        const player = await prisma.player.findUnique({ where: { id: playerId }, select: { id: true } })
        if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

        const existing = await prisma.sidelined.findFirst({
            where: { playerId, completed: false },
            select: { id: true }
        })
        if (existing) {
            return NextResponse.json({ error: 'Player already has an active sidelined entry' }, { status: 409 })
        }

        const row = await prisma.sidelined.create({
            data: {
                playerId,
                source: 'MANUAL',
                category,
                typeId: 0,
                typeName: typeName.trim(),
                startDate: start,
                endDate: end,
                gamesMissed: 0,
                completed: false
            },
        })

        return NextResponse.json({ success: true, id: row.id })
    } catch (err) {
        console.error('[admin/sidelined/create] error:', err)
        return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
    }
}