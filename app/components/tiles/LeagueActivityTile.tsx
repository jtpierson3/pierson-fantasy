'use client'

import { useRouter } from 'next/navigation'

type ActivityItem = {
    id: string
    kind: 'claim' | 'bid'
    teamName: string
    playerAddedName: string
    playerDroppedName: string | null
    processedAt: string
    amount: number | null
    bidStatus: 'pending' | 'won' | null
}

type Props = {
    activity: ActivityItem[]
}

function timeAgo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime()
    const minutes = Math.floor(diffMs/60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes/60) 
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

function formatM(amount: number): string {
    return `$${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`
}

export default function LeagueActivityTile({ activity }: Props) {
    const router = useRouter()

    return (
        <button
            onClick={() => router.push('/dashboard/league/transactions')}
            className='w-full h-full text-left bg-white border border-gray-100 p-4 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all flex flex-col overflow-hidden'
        >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 flex-shrink-0">
                League Activity
            </p>

            {activity.length === 0 ? (
                <p className="text-xs text-gray-400">No recent activity</p>
            ) : (
                <div className="flex flex-col gap-2 overflow-hidden">
                    {activity.slice(0,6).map(item => (
                        <div key={item.id} className="text-xs border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-900 truncate">
                                    {item.teamName}
                                    {item.kind === 'bid' && (
                                        <span
                                            className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                item.bidStatus === 'pending'
                                                    ? 'bg-blue-50 text-blue-600'
                                                    : 'bg-green-50 text-green-700'
                                            }`}
                                        >
                                            {item.bidStatus === 'pending'
                                                ? `bid ${formatM(item.amount ?? 0)}`
                                                : `won ${formatM(item.amount ?? 0)}`
                                            }
                                        </span>
                                    )}
                                </p>
                                <span className="text-gray-400 flex-shrink-0 ml-2">{timeAgo(item.processedAt)}</span>
                            </div>
                            <p className="text-gray-500 truncate">
                                <span className='text-green-600'>{item.playerAddedName}</span>
                                {item.playerDroppedName && (
                                    <span className="text-red-500"> - {item.playerDroppedName}</span>
                                )}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </button>
    )
}