'use client'

import { useRouter } from 'next/navigation'
import type { TeamWithRecord } from "./types"

type Props = {
    teams: TeamWithRecord[]
    currentTeamId: string
}

export default function Standings({ teams, currentTeamId }: Props) {
    const router = useRouter()

    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-medium text-gray-900">Standings</h2>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 -y-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Team</div>
                <div className="col-span-1 text-center">W</div>
                <div className="col-span-1 text-center">L</div>
                <div className="col-span-1 text-center">D</div>
                <div className="col-span-2 text-right">Pts</div>
                <div className="col-span-2 text-right">Change</div>
            </div>

            {/* Rows */}
            {teams.map((team, index) => {
                const isCurrentTeam = team.id === currentTeamId
                return (
                    <div
                        key={team.id}
                        onClick={() => router.push(`/dashboard/league/team/${team.id}`)}
                        className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-50 last:border-0 text-sm transition-colors ${
                            isCurrentTeam
                                ? 'bg-green-50'
                                : 'hover:bg-gray-50'
                        }`}
                    >
                        {/* Position */}
                        <div className={`col-span-1 font-medium ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-amber-600' :
                            'text-gray-400'
                        }`}>
                            {index + 1}
                        </div>

                        {/* Team Name */}
                        <div className="col-span-4">
                            <p className={`font-medium truncate ${isCurrentTeam ? 'text-green-800' : 'text-gray-800'}`}>
                                {team.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{team.user.username}</p>
                        </div>

                        {/* Ws */}
                        <div className="col-span-1 text-center text-gray-600">{team.wins}</div>

                        {/* Ls */}
                        <div className="col-span-1 text-center text-gray-600">{team.losses}</div>

                        {/* Ds */}
                        <div className="col-span-1 text-center text-gray-600">{team.draws}</div>

                        {/* Points */}
                        <div className={`col-span-2 text-right font-medium ${
                            isCurrentTeam ? 'text-green-800' : 'text-gray-800'
                        }`}> 
                            {team.totalLeaguePoints}
                        </div>

                        {/* Change */}
                        <div className={`col-span-2 text-right font-medium ${
                            team.standingsChange > 0 ? 'text-green-800' :
                            team.standingsChange < 0 ? 'text-red-800' :
                            'text-gray-800'
                        }`}>
                            {team.standingsChange}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}