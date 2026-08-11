import type { Player, Team } from '@prisma/client'

/**
 * Full canonical shape for "a real Player with its team relation."
 * Use this anywhere you have (or are querying) actual Prisma data —
 * PlayerList, admin pages, anywhere doing real roster/DB operations.
 */
export type PlayerWithTeam = Player & { team: Team | null }

/**
 * Minimal shape for display-only rendering (PlayerCard, PlayerListRow).
 * Deliberately narrow — only the fields these components actually render.
 * A full PlayerWithTeam automatically satisfies this (structural typing),
 * so real Prisma-sourced callers never need to think about it. Hand-built
 * objects (e.g. MatchupPitch's lineup snapshot data) only need to include
 * this smaller subset, honestly reflecting what data they actually have.
 */
export type DisplayPlayer = {
  id: number
  display_name: string
  image_path: string
  position_id: number
  jersey_number?: number | null
  date_of_birth?: string | null
  team?: { leagueId: number } | null
}

/**
 * Minimal team shape for display-only rendering - name, image, and
 * leagueId for eligibility checks. A full Team object satisfies this
 * automatically.
 */
export type DisplayTeam = {
    name: string
    image_path: string
    leagueId?: number
}