'use client'

import type { MatchupWithTeams } from "./types"
import { getMatchResult, getMyPoints, getTheirPoints, getOpponent } from "./types"

type Props = {
    matchups: MatchupWithTeams[]
    currentTeamId: string
    onViewAll: () => void
}

const RESULT_STYLES = {
    W: 'bg-green-100 text-green-700 border-green-200',
    L: 'bg-red-100 text-red-600 border-red-200',
    D: 'bg-gray-100 text-gray-500 border-gray-200'
}

export default function RecentResults({ matchups, currentTeamId, onViewAll }: Props) {
    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-medium text-gray-900">
                    Schedule
                </h2>
                <button>
                    View All
                </button>
            </div>
        </div>
    )
}