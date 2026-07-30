'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'

type FixtureItem = {
    id: number
    homeTeamName: string
    awayTeamName: string
    homeTeamImage: string | null
    awayTeamImage: string | null
    kickoff: string
    competition: string
}

type Props = {
    fixtures: FixtureItem[]
}

const COMPETITION_LABELS: Record<string, string> = {
    premier_league: 'PL',
    fa_cup: 'FA Cup',
    carabao_cup: 'Carabao Cup'
}

function formatKickoff(iso:string): string {
    const date = new Date(iso)
    return date.toLocaleString(undefined, {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit'
    })
}

export default function NextFixturesTile({ fixtures }: Props) {
    const router = useRouter()

    return (
        <button
            onClick={() => router.push('/dashboard/fixtures')}
            className="w-full h-full text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all flex flex-col overflow-hidden"
        >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 flex-shrink-0">
                Next Fixtures
            </p>

            {fixtures.length === 0 ? (
                <p className="text-xs text-gray-400">No Upcoming Fixtures</p>
            ) : (
                <div className="flex flex-col gap-2 overflow-hidden">
                    {fixtures.map(fx => (
                        <div key={fx.id} className="text-xs border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-gray-400">{formatKickoff(fx.kickoff)}</span>
                                <span className="text-gray-300">{COMPETITION_LABELS[fx.competition]}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {fx.homeTeamImage && (
                                    <div className="relative w-4 h-4 flex-shrink-0">
                                        <Image src={fx.homeTeamImage} alt={fx.homeTeamName} fill className="object-contain" />
                                    </div>
                                )}
                                <span className="text-gray-900 font-medium truncate">{fx.homeTeamName}</span>
                                <span className="text-gray-300">vs</span>
                                <span className="text-gray-900 font-medium truncate">{fx.awayTeamName}</span>
                                {fx.awayTeamImage && (
                                    <div className="relative w-4 h-4 flex-shrink-0">
                                        <Image src={fx.awayTeamImage} alt={fx.awayTeamName} fill className="object-contain" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </button>
    )
}