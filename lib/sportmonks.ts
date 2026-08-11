import { env } from '@/lib/env'

const BASE_URL = 'https://api.sportmonks.com/v3/football'

export const LEAGUE_ID = 8

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

export type SquadMember = {
    position_id: number | null
    detailed_position_id: number | null
    jersey_number: number | null
    player: {
        id: number
        display_name: string
        image_path: string
        date_of_birth: string | null
    } | null
}

export type Transfer = {
    id: number
    player_id: number
    type_id: number
    from_team_id: number | null
    to_team_id: number | null
    date: string
    amount: number | null
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
  round: { name: string } | null
  stage: { name: string } | null
  participants: Participant[]
  scores: Score[]
}

export type League = {
    id: number
    name: string
    currentseason: Season
}

export type TeamSummary = {
    id: number
    name: string
    short_code: string | null
    image_path: string
}

export type LeagueSummary = {
    id: number
    name: string
    short_code: string | null
    image_path: string
}

type SportmonksPaginatedResponse<T> = {
    data: T[]
    pagination?: {
        count: number
        per_page: number
        current_page: number
        has_more: boolean
    }
}

type SportmonksResponse<T> = { data: T }
type SportmonksListResponse<T> = { data: T[] }

export async function sportmonksFetch(endpoint: string, revalidate = 60, retries = 3): Promise<unknown> {
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

async function sportmonksFetchPaginated<T>(endpoint: string, revalidate = 60): Promise<T[]> {
    let allData: T[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
        const separator = endpoint.includes('?') ? '&' : '?'
        const pageUrl = `${endpoint}${separator}page=${page}`
        const result = await sportmonksFetch(pageUrl, revalidate) as SportmonksPaginatedResponse<T>

        allData = allData.concat(result.data ?? [])
        hasMore = result.pagination?.has_more ?? false
        page++

        // Safety Valve - avoid infinite loops if something goes wrong
        if (page > 40) break
    }

    return allData
}

// Fetch all fixtures for a given league/season, for the fixtures sync route
export async function getFixturesBySeason(seasonId: number): Promise<Fixture[]> {
    return await sportmonksFetchPaginated<Fixture>(
        `/fixtures?filters=fixtureSeasons:${seasonId}&include=participants;scores;venue;state;round;stage&per_page=50`,
        DAILY_RESET
    )
}

export async function getSquad(seasonId: number, teamId: number): Promise<SquadMember[]> {
    const data = await sportmonksFetch(
        `/squads/seasons/${seasonId}/teams/${teamId}?include=player`
    ) as SportmonksListResponse<SquadMember>
    return data.data ?? []
}

export async function getPlayerTransfers(playerId: number): Promise<Transfer[]> {
    const data = await sportmonksFetch(
        `/transfers/players/${playerId}`
    ) as SportmonksListResponse<Transfer>
    return data.data ?? []
}

export async function getTeamsBySeason(seasonId: number): Promise<TeamSummary[]> {
    const data = await sportmonksFetch(
        `/teams/seasons/${seasonId}`
    ) as SportmonksListResponse<TeamSummary>
    return data.data ?? []
}

export async function getLeagueById(leagueId: number): Promise<LeagueSummary | null> {
    const data = await sportmonksFetch(
        `/leagues/${leagueId}?include=currentSeason`
    ) as SportmonksResponse<LeagueSummary>
    return data.data ?? null
}