'use client'

import { useRouter } from 'next/navigation'
import type { LeagueWithData, MatchupWithTeams } from './types'
import {
    getMatchResult,
    getTeamMatchups,
    getOpponent,
    getMyPoints,
    getTheirPoints,
} from './types'
import Standings from './standings'
import CurrentMatchup from './currentMatchup'
//import Schedule from './schedule'

type Props = {
    league: LeagueWithData
    currentTeamId: string
}

export default function LeagueDashboard({ league, currentTeamId}: Props) {
    const router = useRouter()

    const currentGameweek = league.gameweeks.find(gw => gw.isCurrent)
    const allMatchups = getTeamMatchups(
        league.teams.find(t => t.id === currentTeamId)!,
        league.gameweeks
    )

    const currentMatchup = allMatchups.find(
        m => m.gameweek.isCurrent
    ) ?? null

    // Get last 2, current, next two for schedule strip
    const currentIndex = allMatchups.findIndex(m => m.gameweek.isCurrent)
    const scheduleMatchups = allMatchups.slice(
        Math.max(0, currentIndex - 2),
        currentIndex + 3
    )

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl font-medium text-gray-900">{league.name}</h1>
                <p className="text-sm text-gray-500 mt-1">
                    {currentGameweek
                        ? `Gameweek ${currentGameweek.gameweekNumber}`
                        : 'Season not started' }
                </p>
            </div>

            {/* Main Layout */}
            <div className="flex gap-6">
                {/* Left standings 1/3*/}
                <div className="w-1/3">
                    <Standings 
                        teams={league.teams}
                        currentTeamId={currentTeamId}
                    />
                </div>

                {/* Right - matchups/schedules 2/3*/}
                <div className="flex-1 flex flex-col gap-4">
                    <CurrentMatchup 
                        matchup={currentMatchup}
                        currentTeamId={currentTeamId}
                        onClick={() => currentMatchup && router.push(`/dashboard/league/matchup/${currentMatchup.id}`)}
                    />
                   {/* 
                    <Schedule 
                        matchups={scheduleMatchups}
                        currentTeamId={currentTeamId}
                        onViewAll{() => router.push('dashboard/league/schedule')}
                    />
                    */}
                </div>
            </div>
        </div>
    )
}