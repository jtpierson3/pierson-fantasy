const BASE_URL = 'https://v3.football.api-sports.io'

async function fetcher(endpoint: string) {
    const res = await fetch('${BASE_URL}${endpoint}', {
        headers: {
            'x-apisports-key': process.env.API_FOOTBALL_KEY!,
        },
        next: { revalidate: 3600 } // cache for 1 hour
    })

    if (!res.ok) {
        throw new Error('API Football error: ${res.status}')
    }

    return res.json()
}

// NOTES: FREE TIER HAS NO ACCESS TO CURRENT SEASON (2024 is for 2024-25).
const EPL_LEAGUE_ID = 39
const CURRENT_SEASON = 2024

export async function getEPLPlayers(page = 1) {
    return fetcher('players?league=${EPL_LEAGUE_ID)&season={CURRENT_SEASON}')
}

