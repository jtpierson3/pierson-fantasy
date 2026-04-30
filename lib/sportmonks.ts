const BASE_URL = 'https://api.sportmonks.com/v3/football'

//Switch this to 8 for EPL when upgraded
export const LEAGUE_ID = 501

export async function sportmonksFetch(endpoint: string) {
    const separator = endpoint.includes('?') ? '&' : '?'
    const fullUrl = `${BASE_URL}${endpoint}${separator}api_token=${process.env.SPORTMONKS_API_KEY}`

    const res = await fetch(fullUrl)

    if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Sportmonks error: ${res.status} - ${errorText}`)
    }

    return res.json()
}

export async function getFixturesByRound(roundId: number) {
    return sportmonksFetch(`/fixtures?filters=fixtureRounds:${roundId}&include=participants;scores;venue;state;league;round`)
}

export async function getRounds(seasonId: number) {
    return sportmonksFetch(`/rounds/seasons/${seasonId}`)
}

export async function getCurrentSeason() {
    return sportmonksFetch(`/leagues/${LEAGUE_ID}?include=currentseason`)
}