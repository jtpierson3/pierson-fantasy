import { env } from '@/lib/env'

const BASE_URL = 'https://api.sportmonks.com/v3/football'

export const LEAGUE_ID = 8

// All Competitions we sync - single source of truth for League/Season Ids
export const COMPETITIONS = {
    premier_league: { leagueId: 8, seasonId: 28083 },
    fa_cup: { leagueId: 24, seasonId: 28020 },
    carabao_cup: { leagueId: 27, seasonId: 27917 }
} as const

export type CompetitionKey = keyof typeof COMPETITIONS

export type FixtureState = {
    id: number
    stateCode: string
    name: string
}

// Sportmonks fixture state_id -> our internal status string
export const FIXTURE_STATE_MAP: FixtureState[] = [
    { id: 1, stateCode: 'NS', name: 'Not Started' },
    { id: 2, stateCode: 'H1', name: '1st Half' },
    { id: 3, stateCode: 'HT', name: 'Half Time' },
    { id: 4, stateCode: 'BR', name: 'Regular Time Finished' },
    { id: 5, stateCode: 'FT', name: 'Full Time' },
    { id: 6, stateCode: 'ET', name: 'Extra Time' },
    { id: 7, stateCode: 'AET', name: 'Finished After Extra Time' },
    { id: 8, stateCode: 'FTP', name: 'Full Time After Penalties' },
    { id: 9, stateCode: 'PEN', name: 'Penalty Shootout' },
    { id: 10, stateCode: 'PPD', name: 'Postponed' },
    { id: 11, stateCode: 'SSP', name: 'Suspended' },
    { id: 12, stateCode: 'CAN', name: 'Cancelled' },
    { id: 13, stateCode: 'TBA', name: 'To Be Announced' },
    { id: 14, stateCode: 'WO', name: 'Walk Over' },
    { id: 15, stateCode: 'ABD', name: 'Abandoned' },
    { id: 16, stateCode: 'DEL', name: 'Delayed' },
    { id: 17, stateCode: 'AWD', name: 'Awarded' },
    { id: 18, stateCode: 'INT', name: 'Interrupted' },
    { id: 19, stateCode: 'AU', name: 'Awaiting Updates' },
    { id: 20, stateCode: 'DT', name: 'Deleted' },
    { id: 21, stateCode: 'ETBR', name: 'Extra Time Break' },
    { id: 22, stateCode: 'H2', name: 'Second Half' },
    { id: 25, stateCode: 'PBR', name: 'Penalty Break' },
    { id: 26, stateCode: 'P..', name: 'Pending' },
]

export function mapFixtureStatus(stateId: number): string {
  return FIXTURE_STATE_MAP.find(s => s.id === stateId)?.stateCode ?? 'UNKNOWN'
}

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
  state_id: number
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

async function sportmonksFetch(endpoint: string, revalidate = 60, retries = 3): Promise<unknown> {
    const separator = endpoint.includes('?') ? '&' : '?'
    const fullUrl = `${BASE_URL}${endpoint}${separator}api_token=${env.SPORTMONKS_API_KEY}`

    const res = await fetch(fullUrl, { 
        next: { revalidate }
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

export async function getCurrentSeason(): Promise<Season | null> {
    const data = await sportmonksFetch(
        `/leagues/${LEAGUE_ID}?include=currentseason`,
        DAILY_RESET
    ) as SportmonksResponse<League>
    return data.data?.currentseason ?? null
}

export async function getRounds(seasonId: number): Promise<Round[]> {
    const data = await sportmonksFetch(
        `/rounds/seasons/${seasonId}`,
        DAILY_RESET
    ) as SportmonksListResponse<Round>
    return data.data ?? []
}

export async function getFixturesByRound(roundId: number): Promise<Fixture[]> {
  const data = await sportmonksFetch(
    `/fixtures?filters=roundLeagues:${roundId}&include=participants;scores;venue;state;round&per_page=20`,
    HOURLY_RESET
  ) as SportmonksListResponse<Fixture>
  return data.data ?? []
}

// Fetch all fixtures for a given league/season, for the fixtures sync route
export async function getFixturesBySeason(leagueId: number): Promise<Fixture[]> {
    const data = await sportmonksFetch(
        `/fixtures?filters=fixtureLeagues:${leagueId}&include=participants;scores;venue;state;round&per_page=50`,
        DAILY_RESET
    ) as SportmonksListResponse<Fixture>
    return data.data ?? []
}
