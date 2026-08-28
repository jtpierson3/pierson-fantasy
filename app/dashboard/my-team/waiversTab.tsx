'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { FantasyTeamWithPlayers } from './types'
import ClaimModal from '@/app/components/ClaimModal'
import FuturePlayerSearch from '@/app/components/FuturePlayerSearch'
import TransferBidModal from '@/app/components/TransferBidModal'

type SearchPlayer = {
  id: number
  display_name: string
  image_path: string | null
  team: { name: string } | null
}

export type BidStatus = {
  id: string
  playerId: number
  playerName: string
  playerImage: string | null
  myAmount: number
  currentHighAmount: number
  currentHighBidderName: string
  isWinning: boolean
}

export type ClaimStatus = {
  id: string
  rank: number
  status: string
  submittedAt: string
  player: { id: number; display_name: string; image_path: string | null }
  playerToDrop: { display_name: string } | null
  isLeading: boolean
  competingClaimsCount: number
  currentHighBid: number | null
  currentHighBidderName: string | null
  myBidAmount: number | null
  hasForeignBid: boolean
}

type Props = {
  team: FantasyTeamWithPlayers
  initialClaims: ClaimStatus[]
  initialBids: BidStatus[]
  availableFunds: number
}

export default function WaiversTab({ team, initialClaims, initialBids, availableFunds }: Props) {
  return (
    <WaiversTabInner 
      key={initialClaims.map(c => c.id).join(',')}
      team={team}
      initialClaims={initialClaims}
      initialBids = {initialBids}
      availableFunds={availableFunds}
    />
  )
}

function WaiversTabInner({ team, initialClaims, initialBids, availableFunds }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchPlayer[]>([])
  const [searching, setSearching] = useState(false)
  const [claimingPlayer, setClaimingPlayer] = useState<SearchPlayer | null>(null)

  const [orderedClaims, setOrderedClaims] = useState(initialClaims)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderDirty, setOrderDirty] = useState(false)

  const [raisingBid, setRaisingBid] = useState<BidStatus | null>(null)
  const [biddingClaim, setBiddingClaim] = useState<ClaimStatus | null>(null)

  const MIN_STARTING_BID = 1_000_000
  const bidMinFor = (highBid: number | null) => highBid ? Math.floor(highBid / 1_000_000) * 1_000_000 + 1_000_000 : MIN_STARTING_BID

  useEffect(() => {
      const timeout = setTimeout(async () => {
        if (search.length < 2) {
          setResults([])
            return
        }
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

  const moveClaim = (index: number, direction: -1 | 1) => {
    setOrderedClaims(prev => {
      const updated = [...prev]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= updated.length) return prev
      ;[updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]]
      return updated
    })
    setOrderDirty(true)
  }

  const saveOrder = async () => {
    setSavingOrder(true)
    try {
      const res = await fetch('/api/waivers/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fantasyTeamId: team.id,
          orderedClaimIds: orderedClaims.map(c => c.id)
        })
      })
      if (!res.ok) throw new Error('Failed to save order')
      setOrderDirty(false)
      router.refresh()
    } catch {
      // handle error
    } finally {
      setSavingOrder(false)
    }
  }

  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const cancelClaim = async (claimId: string) => {
    setCancellingId(claimId)
    try {
      const res = await fetch('/api/waivers/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId })
      })
      if (!res.ok) throw new Error('Failed to cancel claim')
      router.refresh()
    } catch {
      //handle error
    } finally {
      setCancellingId(null)
    }
  }

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
          className="w-full px-3 py-2 text-sm border border-gray-200 text-gray-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
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

        {search.length >= 2 && !searching && results.length === 0 && (
          <div className="mt-3">
            <FuturePlayerSearch 
              onSelect={(player) => {
                setClaimingPlayer(player)
              }}
            />
          </div>
        )}
      </div>

      {/* Pending claims - reorderable by rank */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-900 mb-2">Your Pending Claims</h2>
          {orderDirty && (
            <button
              onClick={saveOrder}
              disabled={savingOrder}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
            >
              {savingOrder ? 'Saving...' : 'Save Order'}
            </button>
          )}
        </div>
        
        {orderedClaims.length === 0 ? (
            <p className="text-sm text-gray-400">You have no pending claims</p>
        ) : (
            <div className="flex flex-col gap-2">
              {orderedClaims.length > 1 && (
                <p className="text-xs text-gray-400 mb-1">
                  Rank your claims: Higher ranked claims process first
                </p>
              )}
              {orderedClaims.map((claim, index) => (
                <div
                  key={claim.id}
                  className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {orderedClaims.length > 1 && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveClaim(index, -1)}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveClaim(index,1)}
                          disabled={index === orderedClaims.length - 1}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          ▼
                        </button>
                      </div>
                    )}
                    <span className="text-xs font-medium text-gray-400 w-4">{index + 1}</span>
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
                  <div className="text-right flex items-center gap-2">
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
                        Only Claim
                      </span>
                    )}
                    {(() => {
                      const contested = claim.competingClaimsCount > 1 && !claim.isLeading
                      const canAfford = availableFunds >= bidMinFor(claim.currentHighBid)
                      if (!contested && !claim.hasForeignBid) return null
                      if (claim.myBidAmount !== null) {
                        return (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                            Bid ${claim.myBidAmount}
                          </span>
                        )
                      }
                      if (!canAfford) {
                        return (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">
                            No Funds to Bid
                          </span>
                        )
                      }
                      return (
                        <button
                          onClick={() => setBiddingClaim(claim)}
                          className="text-xs px-3 py-0.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-medium"
                        >
                          {claim.hasForeignBid ? 'Counter Bid' : 'Submit Bid'}
                        </button>
                      )
                    })()}
                    <button
                      onClick={() => cancelClaim(claim.id)}
                      disabled={cancellingId === claim.id}
                      className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 font-medium"
                    >
                      {cancellingId === claim.id ? '...' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
      )}

      {/* Transfer Fund Bids */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-900">Transfer Funds Bids</h2>
          <span className="text-xs text-gray-500">
            ${availableFunds} available
          </span>
        </div>

        {initialBids.length === 0 ? (
          <p className="text-sm text-gray-400">You have no active bids.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {initialBids.map(bid => (
              <div
                key={bid.id}
                className={`border rounded-xl p-3 flex items-center justify-between ${
                  bid.isWinning
                    ? 'bg-white border-gray-100'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                    {bid.playerImage && (
                      <Image src={bid.playerImage} alt={bid.playerName} fill className="object-contain" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{bid.playerName}</p>
                    <p className="text-xs text-gray-400">
                      Your bid: ${bid.myAmount}
                      {!bid.isWinning && (
                        <> - {bid.currentHighBidderName} leads at ${bid.currentHighAmount}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {bid.isWinning ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                      Winning
                    </span>
                  ) : (
                    <button
                      onClick={() => setRaisingBid(bid)}
                      className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors"
                    >
                      Raise
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>

    {biddingClaim && (
      <TransferBidModal 
        playerId={biddingClaim.player.id}
        playerName={biddingClaim.player.display_name}
        fantasyTeamId={team.id}
        rosterPlayers={team.players}
        availableFunds={availableFunds}
        currentHighBid={biddingClaim.currentHighBid}
        existingBidAmount={biddingClaim.myBidAmount}
        onClose={() => setBiddingClaim(null)}
      />
    )}

    {raisingBid && (
      <TransferBidModal 
        playerId={raisingBid.playerId}
        playerName={raisingBid.playerName}
        fantasyTeamId={team.id}
        rosterPlayers={team.players}
        availableFunds={availableFunds + raisingBid.myAmount}
        currentHighBid={raisingBid.currentHighAmount}
        existingBidAmount={raisingBid.myAmount}
        onClose={() => setRaisingBid(null)}
      />
    )}

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
        }}
      />
      )}
    </div>
  )
}