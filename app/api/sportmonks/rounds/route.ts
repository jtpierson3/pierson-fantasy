import { NextResponse } from 'next/server'
import { getRounds } from '@/lib/sportmonks'

type CacheEntry = {
    data: unknown
    timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 60 * 60 *1000 // hourly - don't waste calls

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const seasonId = searchParams.get('seasonId')

        if (!seasonId || isNaN(parseInt(seasonId))) {
            return NextResponse.json({error : 'seasonId required'}, {status: 400})
        }

        const cacheKey = `rounds-${seasonId}`
        const cached = cache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json(cached.data) 
        }

        const data = await getRounds(parseInt(seasonId))
        cache.set(cacheKey, { data, timestamp: Date.now() })

        return NextResponse.json(data)
    } catch (err) {
        console.error('Fixtures Error: ', err)
        return NextResponse.json({ error: 'Failed to fetch rounds' }, { status: 500 })
    }
}