'use client'

import { useRouter } from 'next/navigation'
import { LEAGUE_CUP_GAMEWEEK_TO_ROUND, DOMESTIC_CUP_GAMEWEEK_TO_ROUND } from '@/lib/sportmonksConstants'

type Props = {
    competition: 'league_cup' | 'domestic_cup'
    gameweekNumber: number
    cupPointsTotal: number | null
}

const COMPETITION_LABEL: Record<Props['competition'], string> = {
    league_cup: 'Carabao Cup',
    domestic_cup: 'FA Cup',
}

export default function CurrentCupTile({ competition, gameweekNumber, cupPointsTotal }: Props ) {
    const router = useRouter()
    const label = COMPETITION_LABEL[competition]

    const roundName = competition === 'league_cup'
        ? LEAGUE_CUP_GAMEWEEK_TO_ROUND[gameweekNumber]
        : DOMESTIC_CUP_GAMEWEEK_TO_ROUND[gameweekNumber]

    // TODO: On span for Round get Round name based on gameweek from the Sportmonks constants
    return (
        <button
            onClick={() => router.push(`/dashboard/my-team/cup/${gameweekNumber}`)}
            className="lg:col-span-2 h-full w-full bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all text-left"
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-900">{label}</h2>
                <span className="text-xs text-gray-400">{roundName ?? `GW${gameweekNumber}`}</span>
            </div>

            <div className="flex flex-col items-center justify-center gap-1 py-2">
                <span className="text-3xl font-bold text-gray-900">
                    {cupPointsTotal ?? '-'}
                </span>
                <span className="text-xs text-gray-400">
                    {cupPointsTotal === null ? 'Points not yet calculated' : 'Total points this round'}
                </span>
            </div>

            <p className="text-xs text-gray-400 text-center mt-2">
                Click to view Roster Breakdown
            </p>
        </button>
    )
}