'use client'

import { useState } from 'react'
import type { GameweekWithMatchups } from './types'

type Props = {
    gameweeks: GameweekWithMatchups[]
    currentTeamId: string
}

export default function GameweekMatchups({ gameweeks, currentTeamId }: Props) {
    const currentIndex = gameweeks.findIndex(gw => gw.isCurrent)
    const [selectedIndex, setSelectedIndex] = useState(
        currentIndex >= 0 ? currentIndex : 0
    )

    const selectedGameweek = gameweeks[selectedIndex]
    if (!selectedGameweek) return null

    function prev() {
        setSelectedIndex(i => Math.max(0, i -1))
    }

    function next() {
        setSelectedIndex(i => Math.min(gameweeks.length -1, i+1))
    }

    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {/* Header with Navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <button 
                    onClick={prev}
                    disabled={selectedIndex === 0}
                    className="w-7 h-7 flex items-cetner justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    -
                </button>

                <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                        Gameweek {selectedGameweek.gameweekNumber}
                    </p>
                    {selectedGameweek.isCurrent && (
                        <span className="text-xs text-green-600 font-medium">Current</span>
                    )}
                    {selectedGameweek.isComplete && !selectedGameweek.isCurrent && (
                        <span className="text-xs text-gray-400">Complete</span>
                    )}
                    {!selectedGameweek.isComplete && !selectedGameweek.isCurrent && (
                        <span className="text-xs text-gray-400">Upcoming</span>
                    )}
                </div>

                <button
                    onClick={next}
                    disabled={selectedIndex === gameweeks.length - 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    -
                </button>
            </div>

            {/* Matchups */}
            <div className="divide-y divide-gray-50">
                {selectedGameweek.matchups.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">
                        No matchups scheduled for this gameweek.
                    </p>
                )}
                {selectedGameweek.matchups.map(matchup => {
                    const homeWon = matchup.isComplete && matchup.homePoints > matchup.awayPoints
                    const awayWon = matchup.isComplete && matchup.awayPoints > matchup.homePoints
                    const isMyMatchup = 
                        matchup.homeTeamId === currentTeamId ||
                        matchup.awayTeamId === currentTeamId

                    return (
                        <div
                            key={matchup.id}
                            className={`flex items-ccenter gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
                                isMyMatchup ? 'bg-green-50 hover:bg-green-100' : ''
                            }`}
                        >
                            {/*Home Team*/}
                            <div className="flex-1 text-right min-w-0">
                                <p className={`text-sm truncate ${
                                    homeWon ? 'font-bold text-gray-900' : 'font-normal text-gray-600'
                                } ${matchup.homeTeamId === currentTeamId ? 'text-green-800' : ''}`}>
                                    {matchup.homeTeam.name}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {matchup.homeTeam.user.username}
                                </p>
                            </div>

                            {/* Score */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                {matchup.isComplete || matchup.gameweek.isCurrent ? (
                                    <>
                                        <span className={`text-base font-bold ${homeWon ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {matchup.homePoints}
                                        </span>
                                        <span className="text-gray-300 text-sm">-</span>
                                        <span className={`text-base font-bold ${awayWon ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {matchup.awayPoints}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-xs text-gray-300 px-2">vs</span>
                                )}
                            </div>

                            {/* Away Team */}
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm truncate ${
                                    awayWon ? 'font-bold text-gray-900': 'font-normal text-gray-600'
                                } ${matchup.awayTeamId === currentTeamId ? 'text-green-800' : ''}`}>
                                    {matchup.awayTeam.name}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {matchup.awayTeam.user.username}
                                </p>
                            </div>    
                        </div>
                    )
                })}
            </div>
        </div>
    )
}