'use client'

import { useState, useMemo } from 'react'
import type { FantasyTeamWithPlayers, PlayerWithDetails } from './types'
import { getPositionColor, getPositionShort } from '@/lib/helpers'
import PlayerListRow from '@/app/components/PlayerListRow'

type Props = {
    team: FantasyTeamWithPlayers
}

type PositionFilter = 'ALL' | 'GK' | 'DEF' | 'MID' | 'ATT'

const POSITION_FILTERS: { id: PositionFilter; label: string; positionId: number | null }[] = [
    { id: 'ALL', label: 'All', positionId: null },
    { id: 'GK', label: 'GK', positionId: 24 },
    { id: 'DEF', label: 'DEF', positionId: 25 },
    { id: 'MID', label: 'MID', positionId: 26 },
    { id: 'ATT', label: 'ATT', positionId: 27 },
]

export default function TeamStats({ team }: Props) {
    const [search, setSearch] = useState('')
    const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')

    const filterd = useMemo(() => {
        return team.players.filter(fp => {
            const matchesSearch = fp.player.display_name
                .toLowerCase()
                .includes(search.toLowerCase())
            const matchesPosition = 
                positionFilter === 'ALL' ||
                fp.player.position_id === POSITION_FILTERS.find(f => f.id === positionFilter)?.positionId
            return matchesSearch && matchesPosition
        })
    }, [team.players, search, positionFilter])

    const totalPoints = 0 // wired up when scoring is implemented

    return (
        <div className="max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-900">Team Stats</h2>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
                {/* Search */}
                <input 
                    type="text"
                    placeholder="Search Team..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 w-48"
                />

                {/* Position Filters */}
                <div className="flex items-center gap-1">
                    {POSITION_FILTERS.map(pos => (
                        <button
                            key={pos.id}
                            onClick={() => setPositionFilter(pos.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                positionFilter === pos.id
                                    ? 'bg-green-800 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'    
                            }`}
                        >
                            {pos.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Advanced Filtering */}
        </div>
    )
}