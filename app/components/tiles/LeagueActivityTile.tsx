'use client'

import { useRouter } from 'next/navigation'

type ActivityItem = {
    id: string
    teamName: string
    playerAddedName: string
    playerDroppedName: string | null
    processedAt: string
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

export default function LeagueActivityTile({ activity }: Props) {
    const router = useRouter()

    return (
        <button
            onClick={() => router.push('/dashboard/league/transactions')}
            className='w-full h-full text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all flex flex-col overflow-hidden'
        >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 flex-shrink-0">
                League Activity
            </p>

            {activity.length === 0 ? (
                <p className="text-xs text-gray-400">No recent activity</p>
            ) : (
                <div className="flex flex-col gap-2 overflow-hidden">
                    {activity.map(item => (
                        <div key={item.id} className="text-xs border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-900 truncate">{item.teamName}</p>
                                <span className="text-gray-400 flex-shrink-0 ml-2">{timeAgo(item.processedAt)}</span>
                            </div>
                            <p className="text-gray-500 truncate">
                                <span className="text-green-600">{item.playerAddedName}</span>
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