'use client'

import type { MatchupWithTeams } from "./types"
import { getMyPoints, getTheirPoints, getOpponent } from '@/lib/matchupHelpers'

type Props = {
    matchup: MatchupWithTeams | null
    currentTeamId: string
    onClick: () => void
}

export default function CurrentMatchup({ matchup, currentTeamId, onClick }: Props) {
    if (!matchup) {
        return (
            <div className="bg-white border border-gray-100 rounded-xl p-4">
                <h2 className="text-sm font-medium text-gray-900 mb-2">Current Matchup</h2>
                <p className="text-sm text-gray-400">No matchup scheduled for this gameweek</p>
            </div>
        )
    }

    const opponent = getOpponent(matchup, currentTeamId)
    const myPoints = getMyPoints(matchup, currentTeamId)
    const theirPoints = getTheirPoints(matchup, currentTeamId)
    const myTeam = matchup.homeTeamId === currentTeamId ? matchup.homeTeam : matchup.awayTeam
    const isWinning = myPoints > theirPoints
    const isLosing = myPoints < theirPoints
    const isDraw = myPoints === theirPoints
    
    return (
        <button
            onClick={onClick}
            className="w-full bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all text-left"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-900">Current Matchup</h2>
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py0.5 rounded-full font-medium ${
                        matchup.isComplete
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-green-100 text-green-700'
                    }`}>
                        {matchup.isComplete ? 'Final': 'Live'}
                    </span>
                    <span className="text-xs text-gray-400">GW{matchup.gameweek.gameweekNumber}</span>
                </div>
            </div>

            {/* Score */}
            <div className="flex items-center justify-between gap-4">
                {/* My Team */}
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{myTeam.name}</p>
                    <p className="text-xs text-gray-400">{myTeam.user.username}</p>
                </div>

                {/* Score */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-3xl font-bold ${
                        isWinning ? 'text-green-700' :
                        isLosing ? 'text-red-500' :
                        'text-gray-900'
                    }`}>
                        {myPoints}
                    </span>
                    <span className="text-gray-300 text-lg">-</span>
                    <span className={`text-3xl font-bold ${
                        isLosing ? 'text-green-700' :
                        isWinning ? 'text-red-500' :
                        'text-gray-900'
                    }`}>
                        {theirPoints}
                    </span>
                </div>

                {/* Opponent */}
                <div className="flex-1 text-right">
                    <p className="text-sm font-medium text-gray-900 truncate">{opponent.name}</p>
                    <p className="text-xs text-gray-400">{opponent.user.username}</p>
                </div>
            </div>

            {/* Result Indicator */}
            <div className="mt-3 text-center">
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    isWinning ? 'bg-green-100 text-green-700':
                    isLosing ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-500'
                }`}>
                    {isWinning ? 'Winning' : isLosing ? 'Losing' : 'Draw'}
                </span>
            </div>

            {/* Click hint */}
            <p className="text-xs text-gray-400 text-center mt-2">
                Click to view full matchup.
            </p>

        </button>
    )
}