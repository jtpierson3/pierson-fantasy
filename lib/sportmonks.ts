import { env } from '@/lib/env'

const BASE_URL = 'https://api.sportmonks.com/v3/football'

//Switch this to 8 for EPL when upgraded
export const LEAGUE_ID = 501

export async function sportmonksFetch(endpoint: string) {
    const separator = endpoint.includes('?') ? '&' : '?'
    const fullUrl = `${BASE_URL}${endpoint}${separator}api_token=${env.SPORTMONKS_API_KEY}`

    const res = await fetch(fullUrl, { next: { revalidate: 60 }})

    if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Sportmonks error: ${res.status} - ${errorText}`)
    }

    return res.json()
}

export async function getFixturesByRound(roundId: number, seasonId: number) {
  const data = await sportmonksFetch(
    `/fixtures?filters=fixtureSeasons:${seasonId}&include=participants;scores;venue;state;round&per_page=50`
  )
  // Filter client side by round_id since there's no round filter on free plan
  const allFixtures = data.data ?? []
  return allFixtures.filter((f: { round_id: number }) => f.round_id === roundId)
}

export async function getRounds(seasonId: number) {
    const data = await sportmonksFetch(`/rounds/seasons/${seasonId}`)
    return data.data ?? []
}

export async function getCurrentSeason() {
    const data = await sportmonksFetch(`/leagues/${LEAGUE_ID}?include=currentseason`)
    return data.data?.currentseason ?? null
}