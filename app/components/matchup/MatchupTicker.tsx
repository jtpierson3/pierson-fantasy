'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'

type TickerMatchup = {
    id: string
    homeTeamId: string
    homeTeamName: string
    awayTeamId: string
    awayTeamName: string
    homePoints: number
    awayPoints: number
    isComplete: boolean
}

type Gameweek = {
    id: string
    gameweekNumber: number
}

type Props = {
    currentMatchupId: string
    currentGameweekNumber: number
    sameGameweekMatchups: TickerMatchup[]
    allGameweeks: Gameweek[]
    fantasyLeagueId: string
}

export default function MatchupTicker({
    currentMatchupId,
    currentGameweekNumber,
    sameGameweekMatchups,
    allGameweeks,
    fantasyLeagueId,
}: Props) {
    const router = useRouter()
    const [switchingGameweek, setSwitchingGameweek] = useState(false)

    const handleGameweekChange = useCallback(async (gameweekId: string) => {
        setSwitchingGameweek(true)
        try {
            const res = await fetch(
                `/api/league/find-my-matchup?leagueId=${fantasyLeagueId}&gameweekId=${gameweekId}`
            )
            const data = await res.json()
            if (res.ok && data.matchupId) {
                router.push(`/dashboard/league/matchup/${data.matchupId}`)
            }
        } catch (err) {
            console.error('Failed to switch gameweek:', err)
        } finally {
            setSwitchingGameweek(false)
        }
    }, [fantasyLeagueId, router])

    return (
        <div className="mb-4">
            {/* Gameweek Switcher */}
            <div className="flex items-center justify-between mb-2">
                <select 
                    value=""
                    onChange={e => {
                        if (e.target.value) handleGameweekChange(e.target.value)
                    }}
                    disabled={switchingGameweek}
                    className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                >
                    <option value="">Gameweek {currentGameweekNumber}</option>
                    {allGameweeks.map(gw => (
                        <option key={gw.id} value={gw.id}>
                            Gameweek {gw.gameweekNumber}
                        </option>
                    ))}
                </select>
            </div>

            {/* Ticker - other matchups this gameweek */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {sameGameweekMatchups.map(m => {
                    const isCurrent = m.id === currentMatchupId
                    return (
                        <button
                            key={m.id}
                            onClick={() => router.push(`/dashboard/league/matchup/${m.id}`)}
                            className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs transition-colors ${
                                isCurrent
                                    ? 'bg-green-800 text-white border-green-800'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            <span className="font-medium">{m.homeTeamName}</span>
                            {m.isComplete || true /* show live scores too */ ? (
                                <span className="mx-1.5">{m.homePoints} - {m.awayPoints}</span>
                            ) : (
                                <span className="mx-1.5">vs</span>
                            )}
                            <span className="font-medium">{m.awayTeamName}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}