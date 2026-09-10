'use client'

import PlayerCard from '@/app/components/playerCard'
import type { DisplayPlayer } from '@/lib/playerTypes'

export type CupRosterPlayer = {
    id: string
    points: number
    breakdown: unknown[]
    player: DisplayPlayer
}

type Props = {
    competitionLabel: string
    roundName: string
    teamName: string
    roundTotal: number
    resolved: boolean
    players: CupRosterPlayer[]
}

export default function CupRosterGrid({
    competitionLabel,
    roundName,
    teamName,
    roundTotal,
    resolved,
    players,
}: Props) {
    return(
        <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-start justify-between mb-5">
                <div>
                    <p className="text-xs text-gray-400">{competitionLabel}</p>
                    <h1 className="text-lg font-medium text-gray-900">{roundName}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{teamName}</p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900">{roundTotal}</p>
                    <p className="text-xs text-gray-400">
                        {resolved ? 'Round total' : 'Provisional Total'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-3 gap-y-5">
                {players.map(p => (
                    <PlayerCard key={p.id} player={p.player} points={p.points} />
                ))}
            </div>
        </div>
    )
}