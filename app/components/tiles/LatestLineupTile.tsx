'use client'

import { useRouter } from 'next/navigation'
import StartingElevenPitch from '@/app/components/pitch/StartingElevenPitch'
import type { SlotAssignable } from '@/lib/lineupAssignment'

type Props = {
    formation: string
    players: (SlotAssignable & { rosterSlot: string })[]
    gameweekNumber: number | null
}

export default function LatestLineupTile({ formation, players, gameweekNumber }: Props) {
    const router = useRouter()
    const starters = players.filter(p => p.rosterSlot === 'STARTER')

    return (
        <button
            onClick={() => router.push('/dashboard/my-team')}
            className="w-full text-left lg:col-span-2 text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all"
        >
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-900">Starting XI</h2>
                {gameweekNumber !== null && (
                    <span className="text-xs text-gray-400">GW {gameweekNumber}</span>
                )}
            </div>
            <StartingElevenPitch formation={formation} starters={starters} compact/>
        </button>
    )
}