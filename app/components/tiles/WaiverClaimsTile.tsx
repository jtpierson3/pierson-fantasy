'use client'

import { useRouter } from 'next/navigation'

type Props = {
    claimCount: number
    closesAt: string | null
}

function formatDeadline(iso: string): string {
    const date = new Date(iso)
    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit'
    })
}

export default function WaiverCliamsTile({ claimCount, closesAt }: Props) {
    const router = useRouter()

    return (
        <button
            onClick={() => router.push('/dashboard/my-team?tab=waivers')}
            className="text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all flex flex-col justify-between h-full"
        >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Waiver Claims
            </p>
            <div>
                <p className="text-2xl font-bold text-gray-900">{claimCount}</p>
                <p className="text-xs text-gray-400 mt-1">
                    {closesAt ? `Processes ${formatDeadline(closesAt)}` : 'No upcoming deadline'}
                </p>
            </div>
        </button>
    )
}