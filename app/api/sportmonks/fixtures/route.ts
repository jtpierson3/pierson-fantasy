import { NextResponse } from 'next/server'
import { getFixturesByRound } from '@/lib/sportmonks'

type CacheEntry = {
  data: Record<string, unknown>
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 30 * 1000

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const round = searchParams.get('round')
    const seasonId = searchParams.get('seasonId')

    if (!round || !seasonId) {
      return NextResponse.json({ error: 'round and seasonId required' }, { status: 400 })
    }

    const cacheKey = `fixtures-${seasonId}-${round}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    const data = await getFixturesByRound(parseInt(round), parseInt(seasonId))
    cache.set(cacheKey, { data: data as Record<string, unknown>, timestamp: Date.now() })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Fixtures error:', err)
    return NextResponse.json({ error: 'Failed to fetch fixtures' }, { status: 500 })
  }
}