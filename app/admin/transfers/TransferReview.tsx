'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Prisma } from '@prisma/client'
import { transferTypeLabel, formatCurrency } from '@/lib/transferFormatting'

type PendingTransfer = Prisma.PlayerTransferGetPayload<{
    include: {
        player: { include: { team: true } }
        formerFantasyTeam: { include: { user: true } }
    }
}>

type ReviewedTransfer = Prisma.PlayerTransferGetPayload<{
    include: {
        player: true
        formerFantasyTeam: { include: { user: true } }
    }
}>

type Props = {
    pendingTransfers: PendingTransfer[]
    recentlyReviewed: ReviewedTransfer[]
}

export default function TransferReview({ pendingTransfers, recentlyReviewed }: Props) {
    const router = useRouter()
    const [amounts, setAmounts] = useState<Record<string, string>>({})
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const getAmountInput = useCallback((transfer: PendingTransfer) => {
        return amounts[transfer.id] ?? (transfer.suggestedAmount?.toString() ?? '')
    }, [amounts])

    const handleConfirm = useCallback(async (transfer: PendingTransfer) => {
        const raw = getAmountInput(transfer)
        const confirmedAmount = raw ? parseFloat(raw) : 0

        setProcessingId(transfer.id)
        setError(null)
        try {
            const res = await fetch('/api/admin/transfers/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transferId: transfer.id, confirmedAmount })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to confirm')
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to confirm transfer')
        } finally {
            setProcessingId(null)
        }
    }, [getAmountInput, router])

    const handleDismiss = useCallback(async (transfer: PendingTransfer) => {
        setProcessingId(transfer.id)
        setError(null)
        try {
            const res = await fetch('/api/admin/transfers/dismiss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transferId: transfer.id })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to dismiss')
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to dismiss transfer')
        } finally {
            setProcessingId(null)
        }
    }, [router])

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-xl font-medium text-gray-900 mb-2">Transfer Review</h1>
            <p className="text-sm text-gray-500 mb-6">
                Detected player departures awaiting confirmation before funds are credited to their owners.
            </p>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-600">
                    {error}
                </div>
            )}

            {pendingTransfers.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-xl p-8 text-center mb-8">
                    <p className="text-sm text-gray-400">No pending transfers to review</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3 mb-8">
                    {pendingTransfers.map(transfer => (
                        <div key={transfer.id} className="bg-white border border-gray-100 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                                        {transfer.player.image_path && (
                                            <Image src={transfer.player.image_path} alt={transfer.player.display_name} fill className="object-contain" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{transfer.player.display_name}</p>
                                        <p className="text-xs text-gray-400">
                                            {transferTypeLabel(transfer.transferTypeId)}
                                            {transfer.formerFantasyTeam && (
                                                <> - was on {transfer.formerFantasyTeam.name} ({transfer.formerFantasyTeam.user.username})</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400 flex-shrink-0">
                                    Detected {new Date(transfer.detectedAt).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="mt-3 flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-400 mb-1">
                                        Payout amount {transfer.suggestedAmount !== null && (
                                            <span className="text-gray-400">(suggested: {formatCurrency(transfer.suggestedAmount)}</span>
                                        )}
                                    </label>
                                    <input 
                                        type="number"
                                        step="0.1"
                                        value={getAmountInput(transfer)}
                                        onChange={e => setAmounts(prev => ({ ...prev, [transfer.id]: e.target.value }))}
                                        placeholder="0.0"
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 text-gray-900"
                                    />
                                </div>
                                <button
                                    onClick={() => handleConfirm(transfer)}
                                    disabled={processingId === transfer.id}
                                    className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium self-end"
                                >
                                    {processingId === transfer.id ? '...' : 'Confirm'}
                                </button>
                                <button
                                    onClick={() => handleDismiss(transfer)}
                                    disabled={processingId === transfer.id}
                                    className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 self-end"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <h2 className="text-sm font-medium text-gray-900 mb-3">Recently Reviewed</h2>
            {recentlyReviewed.length === 0 ? (
                <p className="text-sm text-gray-400">No reviewed transfers yet.</p>
            ): (
                <div className="flex flex-col gap-1.5">
                    {recentlyReviewed.map(transfer => (
                        <div key={transfer.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                            <span className="text-gray-700">{transfer.player.display_name}</span>
                            <div className="flex items-center gap-3">
                                {transfer.formerFantasyTeam && (
                                    <span className="text-xs text-gray-400">{transfer.formerFantasyTeam.user.username}</span>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    transfer.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {transfer.status === 'confirmed' ? formatCurrency(transfer.confirmedAmount) : 'Dismissed'}
                                </span>
                            </div>
                        </div>
                    ))}

                </div>
            )}
        </div>
    )
}