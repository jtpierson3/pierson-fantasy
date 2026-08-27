'use client'

import { useState, useMemo, useCallback } from "react"
import Image from 'next/image'
import Link from 'next/link'
import { getTeamColor, getTintBackground } from '@/lib/colors'
import { getPositionShort, getPositionColor } from '@/lib/helpers'
import type { Team } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { Prisma } from '@prisma/client'
import ClaimModal from '@/app/components/ClaimModal'
import FuturePlayerSearch from "@/app/components/FuturePlayerSearch"
import { isPremierLeagueEligible } from "@/lib/playerEligibility"
import type { PlayerWithTeam } from '@/lib/playerTypes'
import { normalizeForSearch } from '@/lib/textNormalization'

type FantasyTeamWithPlayers = Prisma.FantasyTeamGetPayload<{
    include: {
        players: {
            include: { player: true }
        }
    }
}> | null

type RosteredPlayer = Prisma.FantasyTeamPlayerGetPayload<{
    include: {
        fantasyTeam: {
            include: { user: true }
        }
    }
}>

type Props = {
    players: PlayerWithTeam[]
    teams: Team[]
    myFantasyTeam: FantasyTeamWithPlayers
    allRosteredPlayers: RosteredPlayer[]
    draftComplete: boolean
    myPendingClaimPlayerIds: number[]
    scores: Record<number, { total: number; games: number }>
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

export default function PlayerList({ players, teams, myFantasyTeam, allRosteredPlayers, draftComplete, myPendingClaimPlayerIds, scores }: Props) {
    const [layout, setLayout] = useState<Layout>('grid')
    const [search, setSearch] = useState('')
    const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')
    const [teamFilter, setTeamFilter] = useState<string>('ALL')
    const [showAllLeagues, setShowAllLeagues] = useState(false)
    const [showFreeAgentsOnly, setShowFreeAgentsOnly] = useState(true)
    const [minScore, setMinScore] = useState(0)
    const [sortByScore, setSortByScore] = useState(false)

    const filtered = useMemo(() => {
        const list =  players.filter(p => {
            const matchesSearch = normalizeForSearch(p.display_name).includes(normalizeForSearch(search))
            const matchesPosition = positionFilter === 'ALL' || p.position_id === POSITION_IDS[positionFilter]
            const matchesTeam = teamFilter === 'ALL' || p.teamId === parseInt(teamFilter)
            const matchesEligibility = showAllLeagues || isPremierLeagueEligible(p.team?.leagueId)
            const isOwned = allRosteredPlayers.some(rp => rp.playerId === p.id)
            const matchesOwnership = !showFreeAgentsOnly || !isOwned
            const matchesScore = (scores[p.id]?.total ?? 0) >= minScore
            return matchesSearch && matchesPosition && matchesTeam && matchesEligibility && matchesOwnership && matchesScore
        })
        if (sortByScore) {
            list.sort((a, b) => (scores[b.id]?.total ?? 0) - (scores[a.id]?.total ?? 0))
        }
        return list
    }, [players, search, positionFilter, teamFilter, showAllLeagues, showFreeAgentsOnly, allRosteredPlayers, scores, minScore, sortByScore])

    const teamOptions = useMemo(() => {
        return showAllLeagues
            ? teams
            : teams.filter(t => isPremierLeagueEligible(t.leagueId))
    }, [teams, showAllLeagues])

    const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value)
    }, [])

    const handleTeamFilter = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setTeamFilter(e.target.value)
    }, [])

    // Adding Player Functionality
    const [addingPlayer, setAddingPlayer] = useState<PlayerWithTeam | null>(null)
    const [dropPlayerId, setDropPlayerId] = useState<string>('')
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    const myRosteredCount = myFantasyTeam?.players.filter(
        p => p.rosterSlot !== 'IR'
    ).length ?? 0

    const atRosterLimit = myRosteredCount >= 23

    const ownershipMap = useMemo(() => {
        const map = new Map<number, RosteredPlayer>()
        allRosteredPlayers.forEach(rp => map.set(rp.playerId, rp))
        return map
    }, [allRosteredPlayers])

    function hasMyPendingClaim(playerId: number) {
        return myPendingClaimPlayerIds.includes(playerId)
    }

    function getOwnership(playerId: number) {
        return ownershipMap.get(playerId) ?? null
    }

    function isOnMyTeam(playerId: number) {
        return myFantasyTeam?.players.some(p => p.playerId === playerId) ?? false
    }

    const handleAddPlayer = async (player: PlayerWithTeam) => {
        if (!myFantasyTeam) return
        setSaving(true)
        try {
            const res = await fetch('/api/fantasy/roster/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fantasyTeamId: myFantasyTeam.id,
                    playerId: player.id,
                    dropPlayerId: dropPlayerId || null
                }) 
            })

            if (!res.ok) throw new Error("Failed to add player")

            setAddingPlayer(null)
            setDropPlayerId('')
            router.refresh()
        } catch {
            // handle error
        } finally {
            setSaving(false)
        }
    }

    // Waiver Claiming
    const [claimingPlayer, setClaimingPlayer] = useState<PlayerWithTeam | null>(null)

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
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 w-48 text-gray-900"
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
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 text-gray-900"
                >
                    <option value="ALL">All Teams</option>
                    {teamOptions.map(team => (
                        <option key={team.id} value={team.id}>
                            {team.name}
                        </option>
                    ))}
                </select>

                {/* Show only Premier League Players */}
                <button 
                    onClick={() => setShowAllLeagues(prev => !prev)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        showAllLeagues
                            ? 'bg-green-800 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                    {showAllLeagues ? 'Showing All Players' : 'Premier League Only'}
                </button>

                {/* Show only free agents */}
                <button
                    onClick={() => setShowFreeAgentsOnly(prev => !prev)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        showFreeAgentsOnly
                            ? 'bg-green-800 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                    {showFreeAgentsOnly ? 'Free Agents Only' : 'All Players'}
                </button>

                {/* Min Score Filter */}
                <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-gray-500">Min Pts</label>
                    <input
                        type="number"
                        value={minScore}
                        onChange={e => setMinScore(Number(e.target.value) || 0)}
                        className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 text-gray-900"
                    />
                </div>

                {/* Sort by score */}
                <button
                    onClick={() => setSortByScore(prev => !prev)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        sortByScore ? 'bg-green-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                    Sort By Score
                </button>
            </div>  

            {/* No results */}
            {filtered.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-sm text-gray-400 mb-3">
                        No players found matching your filters.
                    </p>
                    <FuturePlayerSearch 
                        onSelect={() => {
                            router.refresh()
                        }}
                    />
                </div>
            )}

            {/* Grid View */}
            {layout === 'grid' && filtered.length >0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filtered.map(player => (
                        <Link 
                            href={`/dashboard/players/${player.id}`}
                            key={player.id}
                        >
                            <div
                                className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all text-center"
                                style = {{
                                    backgroundColor: getTintBackground(getTeamColor(player.team?.name)['primary'], 0.06),
                                    borderTop: `3px solid ${getTeamColor(player.team?.name)['primary']}`
                                }}
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
                                    {player.team?.name ?? player.currentClubName ??  '-'}
                                </p>

                                {/* Position badge */}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPositionColor(player.position_id)}`}>
                                    {getPositionShort(player.position_id)}
                                </span>

                                {/* SCORING */}
                                <div className="mt-2 flex items-center justify-center gap-3 text-xs">
                                    <span className="font-semibold text-gray-900">
                                        {(scores[player.id]?.total ?? 0).toFixed(2)} pts
                                    </span>
                                    <span className="text-gray-400">
                                        {scores[player.id]?.games
                                            ? (scores[player.id].total / scores[player.id].games).toFixed(2)
                                            : '0'}/gm
                                    </span>
                                </div>
                                
                                {/* Ownership + Add */}
                                <div
                                    className="mt-2"
                                    onClick={e => { e.preventDefault(); e.stopPropagation() }}
                                >
                                    {isOnMyTeam(player.id) ? (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                            Your Squad
                                        </span>
                                    ) : getOwnership(player.id) ? (
                                        <span className="text-xs text-gray-400 truncate block">
                                            {getOwnership(player.id)!.fantasyTeam.user.username}
                                        </span>
                                    ) : draftComplete && hasMyPendingClaim(player.id) ? (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                                            Claim In
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                if (draftComplete) {
                                                    setClaimingPlayer(player)
                                                } else {
                                                    setAddingPlayer(player)
                                                    if (!atRosterLimit) handleAddPlayer(player)
                                                }
                                            }}
                                            className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors"
                                        >
                                            {draftComplete ? 'Claim' : '+ Add'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Link>
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
                        <div className="col-span-3">Name</div>
                        <div className="col-span-3">Team</div>
                        <div className="col-span-2">Position</div>
                        <div className="col-span-2">Status</div>
                    </div>

                    {/* Table Rows */}
                    {filtered.map((player,index) => (
                        <Link
                            href={`/dashboard/players/${player.id}`}
                            key={player.id}
                        >
                            <div
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
                                        {player.team && (
                                            <Image 
                                                src={player.team.image_path}
                                                alt={player.team.name}
                                                fill
                                                className="object-contain"
                                            />
                                        )}    
                                    </div>
                                    <span className="text-sm text-gray-500 truncate">{player.team?.name ?? '-'}</span>
                                </div>

                                {/* POSITION */}
                                <div className="col-span-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPositionColor(player.position_id)}`}>
                                        {getPositionShort(player.position_id)}
                                    </span>
                                </div>

                                {/* STATUS */}
                                <div
                                    className="col-span-2"
                                    onClick={e => { e.preventDefault(); e.stopPropagation() }}
                                >
                                    {isOnMyTeam(player.id) ? (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                            Your Team
                                        </span>
                                    ) : getOwnership(player.id) ? (
                                        <span className="text-xs text-gray-400 truncate block">
                                            {getOwnership(player.id)!.fantasyTeam.user.username}
                                        </span>
                                    ) : draftComplete && hasMyPendingClaim(player.id) ? (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow font-medium">
                                            Class In
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                if (draftComplete) {
                                                    setClaimingPlayer(player)
                                                } else {
                                                    setAddingPlayer(player)
                                                    if (!atRosterLimit) handleAddPlayer(player)
                                                } 
                                            }}
                                            className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors"
                                        >
                                            {draftComplete ? 'Claim' : '+ Add'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Claim Modal */}
            {claimingPlayer && myFantasyTeam && (
                <ClaimModal 
                    playerId={claimingPlayer.id}
                    playerName={claimingPlayer.display_name}
                    fantasyTeamId={myFantasyTeam.id}
                    rosterPlayers={myFantasyTeam.players}
                    onClose={() => setClaimingPlayer(null)}
                />
            )}

            {/* Drop Modal - Shown when at roster limit */}
            {addingPlayer && atRosterLimit && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
                        <h3 className="text-base font-medium text-gray-900 mb-1">
                            Add {addingPlayer.display_name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Your roster is full (23 players). Drop a player to make room.
                        </p>

                        <select
                            value={dropPlayerId}
                            onChange={e => setDropPlayerId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4 text-gray-900"
                        >
                            <option value="">Select a player to drop...</option>
                            {myFantasyTeam!.players
                                .filter(p => p.rosterSlot !== 'IR')
                                .map(p => (
                                    <option key={p.id} value={p.playerId}>
                                        {p.player.display_name}
                                    </option>  
                            ))}
                        </select>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setAddingPlayer(null); setDropPlayerId('') }}
                                className="px-4 py-2 text-sm rounded-lg border broder-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAddPlayer(addingPlayer)}
                                disabled={saving || !dropPlayerId}
                                className="px-4 py-2 text-sm rounded-lg bg-blue-700 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 font-medium"
                            >
                                {saving ? 'Adding...' : 'Confirm' }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}