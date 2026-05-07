'use client'

import type { MatchupWithTeams } from "./types"
import { getMatchResult, getMyPoints, getTheirPoints, getOpponent } from "./types"

type Props = {
    matchups: MatchupWithTeams[]
    currentTeamId: string
    onViewAll: () => void
}

const RESULT_STYLES = {
    W: 'bg-green-100 text-green-700 border-green-200',
    L: 'bg-red-100 text-red-600 border-red-200',
    D: 'bg-gray-100 text-gray-500 border-gray-200'
}

export default function RecentResults({ matchups, currentTeamId, onViewAll }: Props) {
    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-medium text-gray-900">
                    Schedule
                </h2>
                <button
                    onClick={onViewAll}
                    className="text-xs text-green-700 hover:text-green-800 font-medium"
                >
                    View All
                </button>
            </div>

            {/* Matchup Strip */}
            <div className="divide-y divide-gray-50">
                {matchups.map(matchup => {
                    const opponent = getOpponent(matchup, currentTeamId)
                    const myPoints = getMyPoints(matchup, currentTeamId)
                    const theirPoints = getTheirPoints(matchup, currentTeamId)
                    const result = getMatchResult(matchup, currentTeamId)
                    const isCurrent = matchup.gameweek.isCurrent

                    return(
                        <div
                            key={matchup.id}
                            className={`flex items-center gap-4 px-4 py-3 transition-colors ${
                                isCurrent ? 'bg-green-50' : 'hover:bg-gray-50'
                            }`}
                        >
                            {/* Gameweek */}
                            <div className="w-8 flex-shrink-0 text-center">
                                <p className={`text-sm font-bold ${isCurrent ? 'text-green-700' : 'text-gray-400'}`}>
                                    GW
                                </p>
                                <p className={`text-sm font-bold ${isCurrent ? 'text-green-700' : 'text-gray-600'}`}>
                                    {matchup.gameweek.gameweekNumber}
                                </p>
                            </div>

                            {/* Opponent */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    vs {opponent.name}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {opponent.user.username}
                                </p>
                            </div>

                            {/* Score or Upcoming */}
                            <div className="flex-shrink-0 text-right">
                                {matchup.isComplete || isCurrent ? (
                                    <p className="text-sm font-medium text-gray-900">
                                        {myPoints} - {theirPoints}
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-400">Upcoming</p>
                                )}
                            </div>

                            {/* Result Badge */}
                            <div className="w-8 flex-shrink-0 text-center">
                                {result ? (
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${RESULT_STYLES[result]}`}>
                                        {result}
                                    </span>
                                ) : isCurrent? (
                                    <span className="text-xs font-medium text-green-600 px-1.5 py-0.5 rouneded border border-green-200 bg-green-50">
                                        Live
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-300">-</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}