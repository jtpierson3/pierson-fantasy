import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { canMakeApiCall, logApiCall } from '@/lib/apiCallBudget'
import { getCurrentClub, type SportmonksTeamStint} from '@/lib/playerTeamResolution'
import type { Prisma } from '@prisma/client'

const BASE_URL = 'https://api.sportmonks.com/v3/football'
const ENDPOINT_KEY = 'players/search'

type SportmonksPlayer = {
    id: number,
    display_name: string
    image_path: string | null
    position_id: number | null
    detailed_position_id: number | null
    date_of_birth: string | null
    teams: SportmonksTeamStint[] | null
}

async function upsertPlayerFromSearch(p: SportmonksPlayer) {
    const currentClub = getCurrentClub(p.teams ?? [])

    if (currentClub) {
        await prisma.team.upsert({
            where: { id: currentClub.id },
            update: { name: currentClub.name, image_path: currentClub.image_path ?? '' },
            create: { id: currentClub.id, name: currentClub.name, image_path: currentClub.image_path ?? '', leagueId: 0}
        })
    }

    const data: Prisma.PlayerUncheckedCreateInput = {
        id: p.id,
        display_name: p.display_name,
        image_path: p.image_path ?? '',
        position_id: p.position_id ?? 0,
        detailed_position_id: p.detailed_position_id,
        date_of_birth: p.date_of_birth,
        teamId: currentClub?.id ?? null
    }

    await prisma.player.upsert({
        where: { id: p.id },
        update: data,
        create: data
    })

    return { id: p.id, dispay_name: p.display_name, image_path: p.image_path, team: currentClub}
}

export async function GET(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({ where: { clerkId } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const q = searchParams.get('q')?.trim()
        if (!q || q.length < 2) return NextResponse.json({ players: [] })

        // Step 1 - search our own db first
        const localMatches = await prisma.player.findMany({
            where: {
                display_name: { contains: q, mode: 'insensitive' }
            },
            include: { team: true },
            take: 10  
        })

        if (localMatches.length > 0) {
            return NextResponse.json({
                players: localMatches.map(p => ({
                    id: p.id,
                    display_name: p.display_name,
                    image_path: p.image_path,
                    team: p.team ? { id: p.team.id, name: p.team.name, image_path: p.team.image_path } : null,
                })),
                source: 'cache'
            })
        }

        // Step 2 - nothing local, check budget and fall through to Sportmonks
        if (!(await canMakeApiCall(ENDPOINT_KEY))) {
            return NextResponse.json({ error: 'Player search unavailable this month - please try again next month' }, { status: 429 })
        }

        const res = await fetch(
            `${BASE_URL}/players/search/${encodeURIComponent(q)}?api_token=${env.SPORTMONKS_API_KEY}&include=teams`
        )

        await logApiCall(ENDPOINT_KEY)

        if (!res.ok) {
            const text = await res.text()
            console.error('[search-any-player] Sportmonks error:', res.status, text)
            return NextResponse.json({ error: 'Search failed' }, { status: 502 })
        }

        const data = await res.json()
        const sportmonksPlayers: SportmonksPlayer[] = data.data ?? []

        // Step 3 - upsert everything we got back, so next search finds it locally
        const upserted = await Promise.all(sportmonksPlayers.slice(0, 10).map(upsertPlayerFromSearch))

        return NextResponse.json({ 
            players: upserted, 
            source: 'sportmonks'
        })
    } catch (err) {
        console.error('[search-any-player] error:', err)
        return NextResponse.json({ error: 'Failed to search players' }, { status: 500 })
    }
}