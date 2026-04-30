import { NextResponse } from 'next/server'
import { getFixturesByRound } from '@/lib/sportmonks'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const round = searchParams.get('round')

    if (!round) {
      return NextResponse.json({ error: 'round required' }, { status: 400 })
    }

    const data = await getFixturesByRound(parseInt(round))
    return NextResponse.json({ data })

  } catch (err) {
    console.error('Fixtures error:', err)
    return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Unknown error' }, 
        { status: 500 })
  }
}