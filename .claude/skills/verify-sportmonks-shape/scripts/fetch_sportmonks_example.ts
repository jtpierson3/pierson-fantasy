/**
 * Fetches ONE real response from the Sportmonks API and pretty-prints it, so
 * parsing code can be written/checked against actual field names and shapes
 * instead of assumed ones. Read-only against Sportmonks, but NOT logged via
 * lib/apiCallBudget.ts's logApiCall() - it's a manual diagnostic call, not
 * part of the tracked sync pipeline. It still counts against the real
 * Sportmonks subscription quota even though it's untracked here, so use it
 * sparingly (one call per shape you need to check) rather than in a loop.
 *
 * Usage:
 *   npx tsx .claude/skills/verify-sportmonks-shape/scripts/fetch_sportmonks_example.ts <endpoint> [include]
 *
 * Examples:
 *   npx tsx .../fetch_sportmonks_example.ts /fixtures/18528480 lineups.details;events
 *   npx tsx .../fetch_sportmonks_example.ts /squads/teams/8
 *   npx tsx .../fetch_sportmonks_example.ts /players/12345 statistics.details
 */
async function main() {
    const dotenv = await import('dotenv')
    dotenv.config({ path: '.env.local' })
    const { env } = await import('@/lib/env')

    const endpoint = process.argv[2]
    const include = process.argv[3]

    if (!endpoint) {
        console.error('Usage: npx tsx fetch_sportmonks_example.ts <endpoint> [include]')
        console.error('Example: npx tsx fetch_sportmonks_example.ts /fixtures/18528480 lineups.details')
        process.exit(1)
    }

    const BASE_URL = 'https://api.sportmonks.com/v3/football'
    const separator = endpoint.includes('?') ? '&' : '?'
    let url = `${BASE_URL}${endpoint}${separator}api_token=${env.SPORTMONKS_API_KEY}`
    if (include) url += `&include=${include}`

    console.log(`Fetching: ${endpoint}${include ? ` (include=${include})` : ''}\n`)

    const res = await fetch(url)
    const body = await res.json()

    if (!res.ok) {
        console.error(`Request failed: ${res.status} ${res.statusText}`)
        console.error(JSON.stringify(body, null, 2))
        process.exit(1)
    }

    console.log(JSON.stringify(body, null, 2))

    // Surface top-level and one-level-nested key names explicitly - this is
    // usually what a mismatch (e.g. detailedPosition vs detailed_position) shows up as.
    const data = body.data ?? body
    const sample = Array.isArray(data) ? data[0] : data
    if (sample && typeof sample === 'object') {
        console.log('\n--- Top-level keys on the sample record ---')
        console.log(Object.keys(sample).join(', '))
    }

    if (body.rate_limit) {
        console.log('\n--- Rate limit info ---')
        console.log(JSON.stringify(body.rate_limit, null, 2))
    }
}

main()
