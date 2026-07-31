import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { canMakeApiCall, logApiCall } from '@/lib/apiCallBudget'

const BASE_URL = 'https://api.sportmonks.com/v3/football'
const ENDPOINT_KEY = 'players/search'

export async function GET(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({ where: { clerkId } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const q = searchParams.get('q')?.trim()
        if (!q || q.length < 2) return NextResponse.json({ players: [] })

        if (!(await canMakeApiCall(ENDPOINT_KEY))) {
            return NextResponse.json({ error: 'Player search unavailable this month - please try again next month' }, { status: 429 })
        }

        const res = await fetch(
            `${BASE_URL}/players/search/${encodeURIComponent(q)}?api_token=${env.SPORTMONKS_API_KEY}&include=team`
        )

        await logApiCall(ENDPOINT_KEY)

        if (!res.ok) {
            const text = await res.text()
            console.error('[search-any-player] Sportmonks error:', res.status, text)
            return NextResponse.json({ error: 'Search failed' }, { status: 502 })
        }

        const data = await res.json()
        const players = (data.data ?? []).slice(0, 10).map((p: {
            id: number
            display_name: string
            image_path: string | null
            team: { id: number; name: string; image_path: string | null } | null
        }) => ({
            id: p.id,
            display_name: p.display_name,
            image_path: p.image_path,
            team: p.team
                ? { id: p.team.id, name: p.team.name, image_path: p.team.image_path }
                : null
        }))

        return NextResponse.json({ players })
    } catch (err) {
        console.error('[search-any-player] error:', err)
        return NextResponse.json({ error: 'Failed to search players' }, { status: 500 })
    }
}