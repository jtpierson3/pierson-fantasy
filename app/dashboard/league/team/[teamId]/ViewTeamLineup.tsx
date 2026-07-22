'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LatestLineup from '@/app/dashboard/my-team/latestLineup'
import type { Prisma } from '@prisma/client'

type TeamWithLineup = Prisma.FantasyTeamGetPayload<{
    include: {
        user: true
        fantasyLeague: true
        players: {
            include: {
                player: { include: { team: true } }
            }
        }
    }
}>

type Props = {
    team: TeamWithLineup
    isOwnTeam: boolean
}

export default function ViewTeamLineup({ team, isOwnTeam }: Props) {
    const router = useRouter()

    return(
        <div className="p-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <Link href="/dashboard/league" className="hover:text-gray-600 transition-colors">
                    {team.fantasyLeague.name}
                </Link>
                <span>/</span>
                <span className="text-gray-900">{team.name}</span>
            </div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-medium text-gray-900">{team.name}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{team.user.username}</p>
                </div>
                {isOwnTeam && (
                    <button
                        onClick={() => router.push('/dashboard/my-team')}
                        className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
                    >
                        Manage My Team
                    </button>
                )}
            </div>

            <LatestLineup team={team} />
        </div>
    )
}