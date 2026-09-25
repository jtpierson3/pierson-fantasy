'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export type ScoringBreakdownLine = {
    label: string
    points: number
    count?: number
    pointsPerUnit?: number
}

const POSITION_OPTIONS = [
    { label: 'Goalkeeper', detailedPositionId: 24 },
    { label: 'Center Back', detailedPositionId: 148 },
    { label: 'Right Back', detailedPositionId: 154 },
    { label: 'Left Back', detailedPositionId: 155 },
    { label: 'Defensive Mid', detailedPositionId: 149 },
    { label: 'Center Mid', detailedPositionId: 153 },
    { label: 'Attacking Mid', detailedPositionId: 150 },
    { label: 'Left Wing', detailedPositionId: 152 },
    { label: 'Right Wing', detailedPositionId: 156 },
    { label: 'Striker', detailedPositionId: 151 },
]

type Props = {
    playerName: string
    playerImage: string
    points: number
    breakdown: unknown
    onClose: () => void
    isAdmin?: boolean
    playerMatchStatsId?: string | null
    currentPositionPlayedId?: number | null
    onCorrected?: (result: { points: number; breakdown: unknown; positionPlayedId: number }) => void
}

export default function PlayerScoringModal({ 
    playerName, playerImage, points, breakdown, onClose,
    isAdmin, playerMatchStatsId, currentPositionPlayedId, onCorrected
}: Props) {
    const [selectedPositionId, setSelectedPositionId] = useState(currentPositionPlayedId ?? '')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    const lines = Array.isArray(breakdown) ? (breakdown as ScoringBreakdownLine[]) : []

    async function handleSave() {
        if (!playerMatchStatsId || selectedPositionId === '') return
        setSaving(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/scoring/correct-position', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerMatchStatsId, positionPlayedId: Number(selectedPositionId) })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to save')
            onCorrected?.({ points: data.points, breakdown: data.breakdown, positionPlayedId: data.positionPlayedId })
        } catch (err) {
            setError(err instanceof Error ? err.message: 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}    
        >
            <div
                className="w-full max-w-sm bg-white rounded-xl p-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8 flex-shrink-0">
                            <Image src={playerImage} alt={playerName} fill className="object-contain rounded-full bg-white" sizes="32px" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-900">{playerName}</h3>
                            <p className="text-xs text-gray-400">{points} pts</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
                        aria-label="Close"
                    >
                        x
                    </button>
                </div>
                <div className="flex flex-col gap-1">
                    {lines.map((line, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">
                                {line.label}
                                {line.count !== undefined && line.pointsPerUnit !== undefined && (
                                    <span className="text-gray-400 ml-1">
                                        ({line.count} X {line.pointsPerUnit})
                                    </span>
                                )}
                                {line.count !== undefined && line.pointsPerUnit === undefined && (
                                    <span className="text-gray-400 ml-1">
                                        ({line.count})
                                    </span>
                                )}
                            </span>
                            <span className={`font-medium ${line.points >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                {line.points > 0 ? '+' : ''}{line.points}
                            </span>
                        </div>
                    ))}
                </div>

                {isAdmin && playerMatchStatsId && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1">Admin: Correct Position Played</p>
                        <div className="flex gap-2">
                            <select
                                value={selectedPositionId}
                                onChange={(e) => setSelectedPositionId(Number(e.target.value))}
                                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1"
                            >
                                <option value="" disabled>Select position...</option>
                                {POSITION_OPTIONS.map(opt => (
                                    <option key={opt.detailedPositionId} value={opt.detailedPositionId}>{opt.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleSave}
                                disabled={saving || selectedPositionId === ''}
                                className="text-xs bg-gray-900 text-white px-2 py-1 rounded disabled:opacity-40"
                            >
                                {saving ? 'Saving...' : 'Save & Recalculate'}
                            </button>
                        </div>
                        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                    </div>
                )}
            </div>
        </div>
    )
}