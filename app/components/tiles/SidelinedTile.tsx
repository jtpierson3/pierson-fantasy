'use client'

import { useRouter } from 'next/navigation'

type Props = {
    sidelinedCount: number
}

export default function SidelinedTile({ sidelinedCount }: Props) {
    const router = useRouter()

    return (
        <button
            onClick={() => router.push('/dashboard/sidelined')}
            className="w-full h-full text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all flex flex-col items-center justify-center text-center"
        >
            <p className="text-xs font-medium text-red-900 uppercase tracking-wide mb-2">
                Sidelined
            </p>
            <p className="text-5xl font-bold text-red-900">{sidelinedCount}</p>
            <p className="text-xs text-red-900 mt-2">
                {sidelinedCount === 1 ? 'player affected' : 'players affected'}
            </p>
        </button>
    )
}