import type { FantasyTeam, FantasyTeamPlayer, Player, Team, FantasyLeague } from '@prisma/client'

export type PlayerWithDetails = FantasyTeamPlayer & {
    player: Player & { team: Team }
}

export type FantasyTeamWithPlayers = FantasyTeam & {
    players: PlayerWithDetails[]
    fantasyLeague: FantasyLeague
}

export const FORMATIONS = [
    '4-3-3',
    '4-4-2',
    '4-5-1',
    '3-5-2',
    '3-4-3',
    '5-3-2',
    '5-4-1'
] as const 

export type Formation = typeof FORMATIONS[number]

export function parseFormation(formation:string): {def: number; mid: number; att: number} {
    const parts = formation.split('-').map(Number)
    return {
        def: parts[0],
        mid: parts[1],
        att: parts[2]
    }
}