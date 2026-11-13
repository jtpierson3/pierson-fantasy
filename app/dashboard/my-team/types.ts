import type { FantasyTeam, FantasyTeamPlayer, Player, Team, FantasyLeague, FantasyCompetition } from '@prisma/client'

export type PlayerWithDetails = FantasyTeamPlayer & {
    player: Player & { team: Team | null }
}

export type FantasyTeamWithPlayers = FantasyTeam & {
    players: PlayerWithDetails[]
    fantasyLeague: FantasyLeague
}

export type TargetGameweek = {
    id: string
    gameweekNumber: number
    competition: FantasyCompetition
} | null
