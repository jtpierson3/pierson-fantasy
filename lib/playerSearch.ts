// Shared pieces of the waiver-tab player search routes.

/** Searches shorter than this return nothing (and are not worth a datbase query). */
export const MIN_SEARCH_LENGTH = 2

/** Max rows a player search returns. */
export const PLAYER_SEARCH_LIMIT = 10

/**
 * Trims a raw search string. Returns null when it is missing or too short to search.
 */
export function normalizeSearchQuery(raw: string | null | undefined): string | null {
    const q = raw?.trim()
    if (!q || q.length < MIN_SEARCH_LENGTH) return null
    return q
}

export type PlayerSearchResult = {
    id: number
    display_name: string
    image_path: string | null
    team: { id: number; name: string; image_path: string | null; leagueId: number } | null
    currentClubName: string | null
}

/**
 * The one response shape for player search. Keeps only what the search UIs read, and always includes
 * team.leagueId so the UI can tell a Premier League player from anyone else.
 * Takes a Prisma player row with its team included.
 */
export function toPlayerSearchResult(p: PlayerSearchResult): PlayerSearchResult {
    return {
        id: p.id,
        display_name: p.display_name,
        image_path: p.image_path,
        team: p.team
            ? { id: p.team.id, name: p.team.name, image_path: p.team.image_path, leagueId: p.team.leagueId }
            : null,
        currentClubName: p.currentClubName,
    }
}