import { env } from '@/lib/env'

const BASE_URL = 'https://api.sportmonks.com/v3/football'

//Switch this to 8 for EPL when upgraded
export const LEAGUE_ID = 501

export type Season = {
    id: number
    name: string
    finished: boolean
    pending: boolean
    is_current: boolean
    starting_at: string
    ending_at: string
}

export type Round = {
  id: number
  name: string
  finished: boolean
  is_current: boolean
  starting_at: string
  ending_at: string
  league_id: number
  season_id: number
}

export type Participant = {
  id: number
  name: string
  image_path: string
  meta: { location: 'home' | 'away' }
}

export type Score = {
  score: { goals: number; participant: 'home' | 'away' }
  description: string
}

export type Fixture = {
  id: number
  starting_at: string
  name: string
  state: { name: string; short_name: string; developer_name: string }
  venue: { name: string; city_name: string } | null
  round: { name: string }
  participants: Participant[]
  scores: Score[]
}

export type League = {
    id: number
    name: string
    currentseason: Season
}

type SportmonksResponse<T> = { data: T }
type SportmonksListResponse<T> = { data: T[] }

export async function sportmonksFetch(endpoint: string, revalidate = 60, retries = 3): Promise<unknown> {
    const separator = endpoint.includes('?') ? '&' : '?'
    const fullUrl = `${BASE_URL}${endpoint}${separator}api_token=${env.SPORTMONKS_API_KEY}`

    const res = await fetch(fullUrl, { 
        next: { revalidate: 60 }
    })

    if (res.status === 429 && retries > 0) {
        console.warn(`Sportmonks rate limited, retrying in 1s ... (${retries} retries left)`)
        await new Promise(r => setTimeout(r, 1000))
        return sportmonksFetch(endpoint, revalidate, retries - 1)
    }

    if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Sportmonks error: ${res.status} - ${errorText}`)
    }

    return res.json()
}

const DAILY_RESET = 60*60*24
const HOURLY_RESET = 60*60

export async function getCurrentSeason() {
    const data = await sportmonksFetch(
        `/leagues/${LEAGUE_ID}?include=currentseason`,
        DAILY_RESET
    ) as SportmonksResponse<League>
    return data.data?.currentseason ?? null
}

export async function getRounds(seasonId: number) {
    const data = await sportmonksFetch(
        `/rounds/seasons/${seasonId}`,
        DAILY_RESET
    ) as SportmonksListResponse<Round>
    return data.data ?? []
}

export async function getFixturesByRound(roundId: number) {
  const data = await sportmonksFetch(
    `/fixtures?filters=roundLeagues:${roundId}&include=participants;scores;venue;state;round&per_page=20`,
    HOURLY_RESET
  ) as SportmonksListResponse<Fixture>
  return data.data ?? []
}
