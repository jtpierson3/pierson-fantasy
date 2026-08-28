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
    onClose: () => void
}

export default function ClaimModal({
    playerId,
    playerName,
    fantasyTeamId,
    rosterPlayers,
    onClose,
}: Props) {
    const router = useRouter()
    const [dropPlayerId, setDropPlayerId] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const nonIrCount = rosterPlayers.filter(p => p.rosterSlot !== 'IR').length
    const rosterFull = nonIrCount >= 23

    const handleSubmit = useCallback(async () => {
        if (rosterFull && !dropPlayerId) {
            setError('Your roster is full - select a player to drop')
            return
        }

        setSaving(true)
        setError(null)

        try {
            const res = await fetch('/api/waivers/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fantasyTeamId,
                    playerToAddId: playerId,
                    playerToDropId: dropPlayerId ? parseInt(dropPlayerId) : null
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to submit claim')
            router.refresh()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit claim')
        } finally {
            setSaving(false)
        }
    }, [rosterFull, dropPlayerId, fantasyTeamId, playerId, router, onClose])

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
                    Claim {playerName}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    {rosterFull 
                        ? 'Your roster is full. Select a player to drop if this claim is processed'
                        : 'Submit a waiver claim for this player.'}
                </p>

                {rosterFull && (
                    <select
                        value={dropPlayerId}
                        onChange={e => setDropPlayerId(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4"
                    >
                        <option value="">Select a player to drop...</option>
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
                        disabled={saving || (rosterFull && !dropPlayerId)}
                        className="px-4 py-2 text-sm rounded-lg bg-blue-700 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 font-medium"
                    >
                        {saving ? 'Submitting...' : 'Submit Claim'}
                    </button>
                </div>
            </div>
        </div>
    )
}