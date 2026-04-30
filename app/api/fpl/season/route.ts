import { NextResponse } from 'next/server'
import { getCurrentSeason } from '@/lib/sportmonks'

let cache: {data: any; timestamp: number} | null = null
const CACHE_TTL = 60 * 60 *1000 // hourly - don't waste calls

export async function GET(req: Request) {
    try {

        if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
            return NextResponse.json(cache.data) 
        }

        const data = await getCurrentSeason()
        cache = { data, timestamp: Date.now() }

        return NextResponse.json(data)
    } catch (err) {
        console.error('Fixtures Error: ', err)
        return NextResponse.json({ error: 'Failed to fetch season' }, { status: 500 })
    }
}