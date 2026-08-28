'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type RosterPlayer = {
    id: string
    playerId: number
    rosterSlot: string
    player: { display_name: string }
}

type Props = {
    playerId: number
    playerName: string
    fantasyTeamId: string
    rosterPlayers: RosterPlayer[]
    availableFunds: number
    currentHighBid: number | null
    existingBidAmount: number | null
    onClose: () => void
}

export default function TransferBidModal({
    playerId,
    playerName,
    fantasyTeamId,
    rosterPlayers,
    availableFunds,
    currentHighBid,
    existingBidAmount,
    onClose,
}: Props) {
    const router = useRouter()
    const [amount, setAmount] = useState(
        existingBidAmount?.toString() ?? (currentHighBid? '' : '1000000')
    )
    const [dropPlayerId, setDropPlayerId] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const nonIrCount = rosterPlayers.filter(p => p.rosterSlot !== 'IR').length
    const rosterFull = nonIrCount >= 23

    const minRequired = currentHighBid
        ? Math.floor(currentHighBid / 1_000_000) * 1_000_000 + 1_000_000
        : 1_000_000

    const handleGoAllIn = useCallback(() => {
        setAmount(availableFunds.toString())
    }, [availableFunds])

    const handleSubmit = useCallback(async () => {
        const numericAmount = parseFloat(amount)
        if (!numericAmount || numericAmount <= 0) {
            setError('Enter a valid bid amount')
            return
        }
        if (rosterFull && !dropPlayerId) {
            setError('Your roster is full - select a player to drop')
            return
        }
        setSaving(true)
        setError(null)
        try {
            const res = await fetch('/api/transfer-bids/place', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fantasyTeamId,
                    playerId,
                    amount: numericAmount,
                    playerToDropId: dropPlayerId ? parseInt(dropPlayerId) : null
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to place bid')
            router.refresh()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message: 'Failed to place bid')
        } finally {
            setSaving(false)
        }
    }, [amount, rosterFull, dropPlayerId, fantasyTeamId, playerId, router, onClose])

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-base font-medium text-gray-900 mb-1">
                    Bid on {playerName}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    Available funds: ${availableFunds.toString()}
                    {currentHighBid !== null && (
                        <> - Current High Bid: ${currentHighBid.toString()}</>
                    )}
                </p>

                <div className="mb-3">
                    <label className="block text-xs text-gray-500 mb-1">
                        Your bid {currentHighBid !== null && `(minimum ${minRequired.toString()}, or go all-in)`}
                    </label>
                    <div className="flex gap-2">
                        <input 
                            type="number"
                            step="1000000"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        />
                        <button
                            onClick={handleGoAllIn}
                            className="px-3 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                            Go All-In
                        </button>
                    </div>
                </div>

                {rosterFull && (
                    <select
                        value={dropPlayerId}
                        onChange={e => setDropPlayerId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4 text-gray-900"
                    >
                        <option value="">Select a player to drop if you win...</option>
                        {rosterPlayers
                            .filter(p => p.rosterSlot !== 'IR')
                            .map(p => (
                                <option key={p.id} value={p.playerId}>
                                    {p.player.display_name}
                                </option>
                        ))}
                    </select>
                )}

                {error && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                        {error}
                    </p>
                )}

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-4 py-2 text-sm rounded-lg bg-blue-700 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 font-medium"
                    >
                        {saving ? 'Placing Bid...' : 'Place Bid'}
                    </button>
                </div>
            </div>
        </div>
    )
}