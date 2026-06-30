// PREMIER LEAGUE CLUB COLORS
export const TEAM_COLORS: Record<string, { primary: string; secondary: string; third: string; }> = {
    'Arsenal': { primary: '#EF0107', secondary: '#040047', third: '#FFFBB0' },
    'Aston Villa': { primary: '#670E36', secondary: '#000000', third: '#95BfE5' },
    'Bournemouth': { primary: '#DA291C', secondary: '#000000', third: '#FFFFFF' },
    'Brentford': { primary: '#E30613', secondary: '#FBB800', third: '#FFFFFF' },
    'Brighton & Hove Albion': { primary: '#0057B7', secondary: '#FFCD00', third: '#D1B0FF' },
    'Burnley': { primary: '#6C1D45', secondary: '#99D6EA', third: '#000000'},
    'Chelsea': { primary: '#034694', secondary: '#000000', third: '#FFFFFF' },
    'Coventry City': { primary: '#40FFFF', secondary: '#FA7500', third: '#000000'},
    'Crystal Palace': { primary: '#1B458F', secondary: '#C4122E', third: '#000000' },
    'Everton': { primary: '#003399', secondary: '#FFFFFF', third: '#000000'},
    'Fulham': { primary: '#000000', secondary: '#CC0000', third: '#FFFFFF' },
    'Ipswich Town': { primary: '#0057b7', secondary: '#C4122e', third: 'FFFFFF' },
    'Hull City': { primary: '#FA7500', secondary: '#000000', third: '#42FFFF'},
    'Leeds United': { primary: '#FFFFFF', secondary: '#FFFC00', third: '#000000'},
    'Liverpool': { primary: '#C8102E', secondary: '#FFFFFF', third: '#000000' },
    'Manchester City': { primary: '#6CABDD', secondary: '#000000', third: '#FFFFFF' },
    'Manchester United': { primary: '#DA020E', secondary: '#002FFF', third: '#FFFFFF' },
    'Newcastle United': { primary: '#241f20', secondary: '#FFFFFF', third: '#24aF20' },
    'Nottingham Forest': { primary: '#DD0000', secondary: '#FFFFFF', third: '#000000' },
    'Sunderland': { primary: '#EB172B', secondary: '#FFB3F2', third: '#FFFFFF' },
    'Tottenham Hotspur': { primary: '#FFFFFF', secondary: '#132257', third: '#B878FF' },
    'West Ham United': { primary: '#7A263A', secondary: '#1BB1E7', third: '#000000' },
    'Wolverhampton Wanderers': { primary: '#FDB913', secondary: '#231F20', third: '#FFFFFF' },
}

export function getTeamColor(teamName: string | null | undefined): { primary: string; secondary: string; third: string } {
    if (!teamName) return { primary: '#6B7280', secondary: '#9CA3AF', third: '#000000' }
    return TEAM_COLORS[teamName] ?? { primary: '#6B7280', secondary: '#9CA3AF', third: '#000000' }
}

export function getContrastTextColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    //relative luminance (per WCAG)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.6 ? '#111827' : '#FFFFFF'
}

export function getTintBackground(hex: string, alpha: number = 0.08): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}