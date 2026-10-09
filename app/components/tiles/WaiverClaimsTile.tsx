'use client'

import { useRouter } from 'next/navigation'
import { WAIVER_TIMEZONE } from '@/lib/waiverWindowCalculation'

type Props = {
    claimCount: number
    closesAt: string | null
}

// Always rendered in the league's timezone (not the viewer's) so the label matches
// when waivers actually process, and server/client renders agree
function formatDeadline(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
        timeZone: WAIVER_TIMEZONE,
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
    })
}

export default function WaiverClaimsTile({ claimCount, closesAt }: Props) {
    const router = useRouter()

    return (
        <button
            onClick={() => router.push('/dashboard/my-team?tab=waivers')}
            className="w-full h-full text-left bg-white border border-gray-100 rounded-xl p-2 hover:border-gray-200 hover:shadow-sm transition-all flex flex-col items-center justify-center text-center"
        >
            <p className="text-xs font-medium text-gray-400 uppercase pb-2 tracking-wide">
                Waiver Claims
            </p>
            <p className="text-5xl font-bold text-gray-900">{claimCount}</p>
            <p className="text-xs pt-2 text-gray-400 mt-1">
                {closesAt ? `Processes ${formatDeadline(closesAt)}` : 'No upcoming deadline'}
            </p>
        </button>
    )
}