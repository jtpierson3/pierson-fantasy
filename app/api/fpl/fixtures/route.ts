import { NextResponse } from "next/server";
import { getFixturesByRound, getCurrentSeason } from "@/lib/sportmonks";

const cache = new Map<string, {data: any; timestamp: number}>()
const CACHE_TTL = 60 * 60 *1000 // hourly - don't waste calls

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const round = searchParams.get('round')
        const seasonId = searchParams.get('seasonId')

        if (!round || !seasonId) {
            return NextResponse.json({error : 'round and seasonId required'}, {status: 400})
        }

        const cacheKey = `fixtures-${seasonId}-${round}`
        const cached = cache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json(cached.data) 
        }

        const data = await getFixturesByRound(parseInt(seasonId), parseInt(round))
        cache.set(cacheKey, { data, timestamp: Date.now() })

        return NextResponse.json(data)
    } catch (err) {
        console.error('Fixtures Error: ', err)
        return NextResponse.json({ error: 'Failed to fetch fixtures' }, { status: 500 })
    }
}