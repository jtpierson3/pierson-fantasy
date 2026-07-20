'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import type { FantasyTeamWithPlayers } from './types'
import ClaimModal from '@/app/components/ClaimModal'

type Props = {
  team: FantasyTeamWithPlayers
}

type SearchPlayer = {
  id: number
  display_name: string
  image_path: string | null
  team: { name: string } | null
}

type ClaimStatus = {
  id: string
  status: string
  submittedAt: string
  player: { id: number; display_name: string; image_path: string | null }
  playerToDrop: { display_name: string } | null
  isLeading: boolean
  competingClaimsCount: number
}

export default function WaiversTab({ team }: Props) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchPlayer[]>([])
  const [searching, setSearching] = useState(false)
  const [claimingPlayer, setClaimingPlayer] = useState<SearchPlayer | null>(null)
  const [myClaims, setMyClaims] = useState<ClaimStatus[]>([])
  const [loadingClaims, setLoadingClaims] = useState(true)

  const loadClaims = useCallback(async () => {
    setLoadingClaims(true)
    try {
      const res = await fetch(`/api/waivers/my-claims?fantasyTeamId=${team.id}`)
      const data = await res.json()
      setMyClaims(data.claims ?? [])
    } catch {
      // handle error
    } finally {
      setLoadingClaims(false)
    }
  }, [team.id])

  useEffect(() => {
    loadClaims()
  }, [loadClaims])

  useEffect(() => {
    if (search.length < 2) {
      setResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/waivers/search-players?q=${encodeURIComponent(search)}&fantasyLeagueId=${team.fantasyLeagueId}`)
        const data = await res.json()
        setResults(data.players ?? [])
      } catch {
        // handle error
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [search, team.fantasyLeagueId])

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Search */}
      <div>
        <h2 className="text-sm font-medium text-gray-900 mb-2">Submit a Claim</h2>
        <input
          type="text"
          placeholder="Search for a player..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
        />

        {searching && (
          <p className="text-xs text-gray-400 mt-2">Searching...</p>
        )}

        {results.length > 0 && (
          <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden">
            {results.map(player => (
              <div
                key={player.id}
                className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                    {player.image_path && (
                      <Image src={player.image_path} alt={player.display_name} fill className="object-contain" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{player.display_name}</p>
                    <p className="text-xs text-gray-400">{player.team?.name ?? '—'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setClaimingPlayer(player)}
                  className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors"
                >
                  Claim
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending claims */}
      <div>
        <h2 className="text-sm font-medium text-gray-900 mb-2">Your Pending Claims</h2>
        {loadingClaims ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : myClaims.length === 0 ? (
          <p className="text-sm text-gray-400">You have no pending claims.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {myClaims.map(claim => (
              <div
                key={claim.id}
                className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                    {claim.player.image_path && (
                      <Image src={claim.player.image_path} alt={claim.player.display_name} fill className="object-contain" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{claim.player.display_name}</p>
                    {claim.playerToDrop && (
                      <p className="text-xs text-gray-400">
                        Dropping: {claim.playerToDrop.display_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {claim.competingClaimsCount > 1 ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      claim.isLeading
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {claim.isLeading ? 'Leading' : 'Losing'}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                      Only claim
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {claimingPlayer && (
        <ClaimModal
          playerId={claimingPlayer.id}
          playerName={claimingPlayer.display_name}
          fantasyTeamId={team.id}
          rosterPlayers={team.players}
          onClose={() => {
            setClaimingPlayer(null)
            setSearch('')
            setResults([])
            loadClaims()
          }}
        />
      )}
    </div>
  )
}