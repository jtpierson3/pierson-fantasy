const BASE_URL = 'https://api.sportmonks.com/v3/football'

//Switch this to 8 for EPL when upgraded
export const LEAGUE_ID = 501

export async function sportmonksFetch(endpoint: string) {
    const separator = endpoint.includes('?') ? '&' : '?'
    const fullUrl = `${BASE_URL}${endpoint}${separator}api_token=${process.env.SPORTMONKS_API_KEY}`

    const res = await fetch(fullUrl)

    if (!res.ok) {
        throw new Error(`Sportmonks error: ${res.status}`)
    }

    return res.json()
}

export async function getFixturesByRound(round: number) {
    return sportmonksFetch(`/fixtures?filters=fixtureRounds:${round}&include=participants;scores;venue;state;league;round&per_page=20`)
}

export async function getRounds(seasonId: number) {
    return sportmonksFetch(`/rounds?filters=roundSeason:${seasonId}&per_page=50`)
}

export async function getCurrentSeason() {
    return sportmonksFetch(`/leagues/${LEAGUE_ID}?include=currentseason`)
}