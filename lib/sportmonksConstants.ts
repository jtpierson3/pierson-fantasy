// All Competitions we sync - single source of truth for League/Season Ids
export const COMPETITIONS = {
    premier_league: { leagueId: 8, seasonId: 28083, seasonEndDate: '2027-06-11' },
    fa_cup: { leagueId: 24, seasonId: 28020 , seasonEndDate: '2027-06-11'},
    carabao_cup: { leagueId: 27, seasonId: 27917, seasonEndDate: '2027-06-11' },
    championship: { leagueId: 9, seasonId: 0, seasonEndDate: '2027-06-11' },
    la_liga: { leagueId: 564, seasonId: 0, seasonEndDate: '2027-06-11' }
} as const

export type CompetitionKey = keyof typeof COMPETITIONS

export type FixtureState = {
    id: number
    stateCode: string
    name: string
}

export const LEAGUE_CUP_ROUND_TO_GAMEWEEK: Record<string, number> = {
    'Round 2': 40,
    'Round 3': 41,
    'Round 4': 42,
    'Quarterfinals': 43,
    'Semi-finals': 44,
    'Final': 45
}

export const DOMESTIC_CUP_ROUND_TO_GAMEWEEK: Record<string, number> = {
    'Round 3': 50,
    'Round 4': 51,
    '5th Round': 52,
    'Quarter-finals': 53,
    'Semi-finals': 54,
    'Final': 55
}

function invertRoundMap(map: Record<string, number>): Record<number, string> {
    return Object.fromEntries(Object.entries(map).map(([ name, num]) => [num, name]))
}

export const LEAGUE_CUP_GAMEWEEK_TO_ROUND: Record<number, string> = invertRoundMap(LEAGUE_CUP_ROUND_TO_GAMEWEEK)
export const DOMESTIC_CUP_GAMEWEEK_TO_ROUND: Record<number, string> = invertRoundMap(DOMESTIC_CUP_ROUND_TO_GAMEWEEK)

export const TRANSFER_TYPES = {
    LOAN_TRANSFER: 218,
    TRANSFER: 219,
    FREE_TRANSFER: 220,
    END_OF_LOAN: 9688
} as const

export type TransferTypeId = typeof TRANSFER_TYPES[keyof typeof TRANSFER_TYPES]

export const FIXTURE_STATE_MAP: FixtureState[] = [
    { id: 1, stateCode: 'NS', name: 'Not Started' },
    { id: 2, stateCode: 'H1', name: '1st Half' },
    { id: 3, stateCode: 'HT', name: 'Half Time' },
    { id: 4, stateCode: 'BR', name: 'Regular Time Finished' },
    { id: 5, stateCode: 'FT', name: 'Full Time' },
    { id: 6, stateCode: 'ET', name: 'Extra Time' },
    { id: 7, stateCode: 'AET', name: 'Finished After Extra Time' },
    { id: 8, stateCode: 'FTP', name: 'Full Time After Penalties' },
    { id: 9, stateCode: 'PEN', name: 'Penalty Shootout' },
    { id: 10, stateCode: 'PPD', name: 'Postponed' },
    { id: 11, stateCode: 'SSP', name: 'Suspended' },
    { id: 12, stateCode: 'CAN', name: 'Cancelled' },
    { id: 13, stateCode: 'TBA', name: 'To Be Announced' },
    { id: 14, stateCode: 'WO', name: 'Walk Over' },
    { id: 15, stateCode: 'ABD', name: 'Abandoned' },
    { id: 16, stateCode: 'DEL', name: 'Delayed' },
    { id: 17, stateCode: 'AWD', name: 'Awarded' },
    { id: 18, stateCode: 'INT', name: 'Interrupted' },
    { id: 19, stateCode: 'AU', name: 'Awaiting Updates' },
    { id: 20, stateCode: 'DT', name: 'Deleted' },
    { id: 21, stateCode: 'ETBR', name: 'Extra Time Break' },
    { id: 22, stateCode: 'H2', name: 'Second Half' },
    { id: 25, stateCode: 'PBR', name: 'Penalty Break' },
    { id: 26, stateCode: 'P..', name: 'Pending' },
]

export function mapFixtureStatus(stateId: number): string {
  return FIXTURE_STATE_MAP.find(s => s.id === stateId)?.stateCode ?? 'UNKNOWN'
}