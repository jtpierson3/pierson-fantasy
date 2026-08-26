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

export type FixtureLineupDetail = {
    type_id: number
    data: { value: number | boolean }
}

export type FixtureLineupEntry = {
    player_id: number
    team_id: number
    type_id: number // 11 starter, 12 substitute
    detailedposition?: { id: number; name: string } | null
    details: FixtureLineupDetail[]
}

export type FixtureEvent = {
    type_id: number
    participant_id: number
    player_id: number | null
    related_player_id: number | null
    minute: number
}

export type FixtureFormation = {
    team_id: number
    location: 'home' | 'away'
    formation: string
}

export type FixtureDetail = {
    id: number
    state_id: number
    participants?: { id: number; meta?: { location: 'home' | 'away' } }[]
    lineups: FixtureLineupEntry[]
    events: FixtureEvent[]
    formations: FixtureFormation[]
    scores?: Score[]
}

export type SidelinedEntry = {
    id: number
    player_id: number
    type_id: number
    category: string
    start_date: string
    end_date: string | null
    games_missed: number
    completed: boolean
    type: {
        name: string
    }
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

type SportmonksFetchResult<T> = {
    data: T
    remaining: number | null
}

async function sportmonksFetchPaginatedWithMeta<T>(
    endpoint: string,
    revalidate = 60
): Promise<{ data: T[]; remaining: number | null}> {
    let allData: T[] = []
    let page = 1
    let hasMore = true
    let remaining: number | null = null

    while (hasMore) {
        const separator = endpoint.includes('?') ? '&' : '?'
        const pageUrl = `${endpoint}${separator}page=${page}`
        const result = await sportmonksFetchWithMeta(pageUrl, revalidate) as SportmonksFetchResult<SportmonksPaginatedResponse<T>>
    
        allData = allData.concat(result.data.data ?? [])
        remaining = result.remaining
        hasMore = result.data.pagination?.has_more ?? false
        page++

        // Safety Valve
        if (page > 40) break
    }

    return { data: allData, remaining }
}

export async function sportmonksFetchWithMeta(
    endpoint: string,
    revalidate = 60,
    retries = 3
): Promise<SportmonksFetchResult<unknown>> {
    const separator = endpoint.includes('?') ? '&' : '?'
    const fullUrl = `${BASE_URL}${endpoint}${separator}api_token=${env.SPORTMONKS_API_KEY}`

    const res = await fetch(fullUrl, { 
        next: { revalidate }
    })

    if (res.status === 429 && retries > 0) {
        console.warn(`Sportmonks rate limited, retrying in 1s ... (${retries} retries left)`)
        await new Promise(r => setTimeout(r, 1000))
        return sportmonksFetchWithMeta(endpoint, revalidate, retries - 1)
    }

    if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Sportmonks error: ${res.status} - ${errorText}`)
    }

    const json = await res.json()
    const remaining = json?.rate_limit?.remaining ?? null

    return { data: json, remaining}
}

export async function sportmonksFetch(endpoint: string, revalidate = 60, retries = 3): Promise<unknown> {
    const result = await sportmonksFetchWithMeta(endpoint, revalidate, retries)
    return result.data
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

export async function getSquad(seasonId: number, teamId: number): Promise<{ squad: SquadMember[]; remaining: number | null}> {
    const { data, remaining } = await sportmonksFetchWithMeta(
        `/squads/seasons/${seasonId}/teams/${teamId}?include=player`
    )
    const squad = (data as SportmonksListResponse<SquadMember>).data ?? []
    return { squad, remaining }
}

export async function getPlayerTransfers(playerId: number): Promise<{ transfers: Transfer[]; remaining: number | null}> {
    const { data, remaining } = await sportmonksFetchWithMeta(
        `/transfers/players/${playerId}`
    )
    const transfers = (data as SportmonksListResponse<Transfer>).data ?? []
    return { transfers, remaining }
}

export async function getTeamsBySeason(seasonId: number): Promise<{ teams: TeamSummary[]; remaining: number| null }> {
    const { data, remaining } = await sportmonksFetchWithMeta(
        `/teams/seasons/${seasonId}`
    )
    const teams = (data as SportmonksListResponse<TeamSummary>).data ?? []
    return { teams, remaining }
}

export async function getLeagueById(leagueId: number): Promise<{league: LeagueSummary | null; remaining: number | null}> {
    const { data, remaining } = await sportmonksFetchWithMeta(
        `/leagues/${leagueId}?include=currentSeason`
    )
    const league = (data as SportmonksResponse<LeagueSummary>).data ?? null
    return { league, remaining }
}

export async function getFixtureDetail(fixtureId: number): Promise<{ fixture: FixtureDetail | null; remaining: number | null }> {
    const { data, remaining } = await sportmonksFetchWithMeta(
        `/fixtures/${fixtureId}?include=lineups.detailedposition;lineups.details.type;events;participants;formations;scores`
    )
    const fixture = (data as { data: FixtureDetail }).data ?? null
    return { fixture, remaining}
}

export async function getTeamSidelined(teamId: number): Promise<{ sidelined: SidelinedEntry[]; remaining: number | null}> {
    const { data, remaining } = await sportmonksFetchWithMeta(
        `/teams/${teamId}?include=sidelined.type`
    )
    const sidelined = (data as { data: { sidelined: SidelinedEntry[] } }).data?.sidelined ?? []
    return { sidelined, remaining }
}

export async function getUpcomingFixturesBySeason(
    seasonId: number,
    endDate: string
): Promise<{ fixtures: Fixture[]; remaining: number | null }> {
    const startDate = new Date().toISOString().slice(0, 10)
    const { data, remaining } = await sportmonksFetchPaginatedWithMeta<Fixture>(
        `/fixtures/between/${startDate}/${endDate}?filters=fixtureSeasons:${seasonId}&include=participants;scores;venue;state;round;stage&per_page=50`,
        DAILY_RESET
    )
    return { fixtures: data, remaining }
}