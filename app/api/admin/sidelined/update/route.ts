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

        const { id, category, typeName, startDate, endDate } = await req.json()
        if (typeof id !== 'string') {
            return NextResponse.json({ error: 'invalid input' }, { status: 400 })
        }

        const row = await prisma.sidelined.findUnique({ where: { id }, select: { source: true } })
        if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        if (row.source !== 'MANUAL') {
            return NextResponse.json({ error: 'Only manual entries can be edited' }, { status: 403 })
        }

        const data: Record<string, unknown> = {}
        if (category !== undefined) {
            if (!CATEGORIES.includes(category)) {
                return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
            }
            data.category = category
        }
        if (typeName !== undefined) {
            if (typeof typeName !== 'string' || !typeName.trim()) {
                return NextResponse.json({ error: 'Invalid typeName' }, { status: 400 })
            }
            data.typeName = typeName.trim()
        }
        if (startDate !== undefined) {
            const d = new Date(startDate)
            if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 })
            data.startDate = d
        }
        if (endDate !== undefined) {
            if (endDate === null) {
                data.endDate = null
            } else {
                const d = new Date(endDate)
                if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 })
                data.endDate = d
            }
        }

        await prisma.sidelined.update({ where: { id }, data })
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[admin/sidelined/update] error:', err)
        return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
    }
}