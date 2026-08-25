'use client'

import { useEffect } from 'react'
import Image from 'next/image'

export type ScoringBreakdownLine = {
    label: string
    points: number
    count?: number
    pointsPerUnit?: number
}

type Props = {
    playerName: string
    playerImage: string
    points: number
    breakdown: unknown
    onClose: () => void
}

export default function PlayerScoringModal({ playerName, playerImage, points, breakdown, onClose }: Props) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    const lines = Array.isArray(breakdown) ? (breakdown as ScoringBreakdownLine[]) : []

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
            </div>
        </div>
    )
}