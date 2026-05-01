'use client'

import { useState, useMemo, useCallback } from "react"
import Image from 'next/image'
import { getPositionShort, getPositionColor } from '@/lib/sportmonks'
import type { Player, Team } from '@prisma/client'

type PlayerWithTeam = Player & { team: Team }

type Props = {
    players: PlayerWithTeam[]
    teams: Team[]
}

type Layout = 'grid' | 'list'
type PositionFilter = 'ALL' | 'GK' | 'DEF' | 'MID' | 'ATT'

const POSITION_IDS: Record<PositionFilter, number | null> = {
    ALL: null,
    GK: 24,
    DEF: 25,
    MID: 26,
    ATT: 27
}

export default function PlayerList({ players, teams }: Props) {
    const [layout, setLayout] = useState<Layout>('grid')
    const [search, setSearch] = useState('')
    const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')
    const [teamFilter, setTeamFilter] = useState<string>('ALL')

    const filtered = useMemo(() => {
        return players.filter(p => {
            const matchesSearch = p.display_name.toLowerCase().includes(search.toLowerCase())
            const matchesPosition = positionFilter === 'ALL' || p.position_id === POSITION_IDS[positionFilter]
            const matchesTeam = teamFilter === 'ALL' || p.teamId === parseInt(teamFilter)
            return matchesSearch && matchesPosition && matchesTeam
        })
    }, [players, search, positionFilter, teamFilter])

    const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value)
    }, [])

    const handleTeamFilter = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setTeamFilter(e.target.value)
    }, [])

    return (
        <div className="p-6">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-medium text-gray-900">Players</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {filtered.length} of {players.length} players
                    </p>
                </div>

                {/* Layout Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setLayout('grid')}
                        className={`p-1.5 rounded-md transition-colors ${
                            layout === 'grid'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title="Grid view"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="1" y="1" width="6" height="6" rx="1" />
                            <rect x="9" y="1" width="6" height="6" rx="1" />
                            <rect x="1" y="9" width="6" height="6" rx="1" />
                            <rect x="9" y="9" width="6" height="6" rx="1" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setLayout('list')}
                        className={`p-1.5 rounded-md transition-colors ${
                            layout === 'list'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title="List view"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="1" y="2" width="14" height="2" rx="1" />
                            <rect x="1" y="7" width="14" height="2" rx="1" />
                            <rect x="1" y="12" width="14" height="2" rx="1" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                {/* Search */}
                <input
                    type="text"
                    placeholder="Search players..."
                    value={search}
                    onChange={handleSearch}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 w-48"
                />

                {/* Position Filter */}
                <div className="flex items-center gap-1">
                    {(['ALL', 'GK', 'DEF', 'MID', 'ATT'] as PositionFilter[]).map(pos => (
                        <button
                            key={pos}
                            onClick={() => setPositionFilter(pos)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                positionFilter === pos
                                    ? 'bg-green-800 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            {pos}
                        </button>
                    ))}
                </div>

                {/* Team filter */}
                <select
                    value={teamFilter}
                    onChange={handleTeamFilter}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
                >
                    <option value="ALL">All Teams</option>
                    {teams.map(team => (
                        <option key={team.id} value={team.id}>
                            {team.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* No results */}
            {filtered.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-12">
                    No players found matching your filters.
                </p>
            )}

            {/* Grid View */}
            {layout === 'grid' && filtered.length >0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filtered.map(player => (
                        <div
                            key={player.id}
                            className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all text-center"
                        >
                            {/* Player Image */}
                            <div className="relative w-16 h-16 mx-auto mb-3">
                                <Image
                                    src={player.image_path}
                                    alt={player.display_name}
                                    fill
                                    className="object-contain rounded-full"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = "https://cdn.sportmonks.com/images/soccer/placeholder.png"
                                    }}
                                />
                            </div>

                            {/* Jersey Number */}
                            {player.jersey_number && (
                                <p className="text-xs text-gray-400 mb-1">#{player.jersey_number}</p>
                            )}

                            {/* Name */}
                            <p className="text-sm font-medium text-gray-900 leading-tight mb-1 truncate">
                                {player.display_name}
                            </p>

                            {/* Team */}
                            <p className="text-xs text-gray-400 truncate mb-2">
                                {player.team.name}
                            </p>

                            {/* Position badge */}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPositionColor(player.position_id)}`}>
                                {getPositionShort(player.position_id)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* List View */}
            {layout === 'list' && filtered.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
                        <div className="col-span-1">#</div>
                        <div className="col-span-1"></div>
                        <div className="col-span-4">Name</div>
                        <div className="col-span-3">Team</div>
                        <div className="col-span-2">Position</div>
                    </div>

                    {/* Table Rows */}
                    {filtered.map((player,index) => (
                        <div
                            key={player.id}
                            className={`grid grid-cols-12 gap-4 px-4 py-3 items-cetner hover:bg-gray-50 transition-colors ${
                                index !== filtered.length - 1 ? 'border-b border-gray-50' : ''
                            }`}
                        >
                            {/* Jersey Number */}
                            <div className="col-span-1 text-xs text-gray-400">
                                {player.jersey_number ?? '-'}
                            </div>

                            {/* Image */}
                            <div className="col-span-1">
                                <div className="relative w-8 h-8">
                                    <Image 
                                        src={player.image_path}
                                        alt={player.display_name}
                                        fill
                                        className="object-contain rounded-full"
                                    />
                                </div>
                            </div>

                            {/* Name */}
                            <div className="col-span-4 text-sm font-medium text-gray-900 truncate">
                                {player.display_name}
                            </div>

                            {/* Team */}
                            <div className="col-span-3 flex items-center gap-2">
                                <div className="relative w-5 h-5 flex-shrink-0">
                                    <Image 
                                        src={player.team.image_path}
                                        alt={player.team.name}
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                                <span className="text-sm text-gray-500 truncate">{player.team.name}</span>
                            </div>

                            {/* POSITION */}
                            <div className="col-span-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPositionColor(player.position_id)}`}>
                                    {getPositionShort(player.position_id)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}