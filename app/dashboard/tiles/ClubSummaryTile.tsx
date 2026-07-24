'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { FantasyTeam, FantasyLeague } from '@prisma/client'

type Props = {
    team: FantasyTeam & { fantasyLeague: FantasyLeague }
    rank: number | null
    totalTeams: number
}

function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] ?? s[v] ?? s [0])
}

export default function ClubSummaryTile({ team, rank, totalTeams }: Props) {
    const router = useRouter()

    return (
        <button
            onClick={() => router.push('/dashboard/league')}
            className="text-left bg-yellow-400 hover:bg-yellow-300 transition-colors rounded-2xl p-5 flex flex-col justify-between h-40 overflow-hidden relative"
        >
            {/* Logo Placeholder */}
            <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-black/10 flex items-center justify-center flex-shrink-0 oveflow-hidden">
                    <span className="text-sm font-bold text-black/60">
                        {team.name.slice(0, 2).toUpperCase()}
                    </span>
                </div>
                {rank !== null && (
                    <span className="text-xs font-semibold bg-black/10 text-black/70 px-2 py-1 rounded-lg">
                        {ordinal(rank)} of {totalTeams}
                    </span>
                )}
            </div>

            {/* Team Name */}
            <div>
                <p className="text-lg font-bold text-black leading-tight truncate">
                    {team.name}
                </p>
                <p className="text-xs text-black/60 truncate">{team.fantasyLeague.name}</p>
            </div>

            {/* Standings Row */}
            <div className="flex flex-col gap-0.5 text-xs text-black/70">
                <div className="flex items-center gap-1.5">
                    <span className="font-medium">League:</span>
                    <span>{team.wins}W {team.losses}L {team.draws}D</span>
                    <span className="font-semibold">- {team.totalLeaguePoints}pts</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="font-medium">Cups:</span>
                    <span className="text-black/50">Carabao - * FA Cup -</span>
                </div>
            </div>
        </button>
    )
}