'use client'

import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'

export type LeadingBidRow = {
    id: string
    playerName: string
    playerImage: string | null
    teamName: string
    amount: number
    competingBids: number
}

export type HistoryItem = {
    id: string
    kind: 'claim' | 'bid'
    teamName: string
    playerAddedName: string
    playerDroppedName: string | null
    status: string
    amount: number | null
    processedAt: string
}

type GameweekOption = { id: string; gameweekNumber: number }

function fmtM(n: number): string {
    return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
}

export default function TransactionsView({
    activeGameweekNumber,
    leadingBids,
    gameweekOptions,
    selectedGameweekId,
    history,
}: {
    activeGameweekNumber: number | null
    leadingBids: LeadingBidRow[]
    gameweekOptions: GameweekOption[]
    selectedGameweekId: string | null
    history: HistoryItem[]
}) {
    const router = useRouter()
    const pathname = usePathname()

    return (
        <div className="p-6">
            <h1 className="text-xl font-medium text-gray-900 mb-4">Transactions</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT - Current Windows Leading Bids */}
                <div>
                    <h2 className="text-sm font-medium text-gray-900 mb-2">
                        Current Transfer Bids
                        {activeGameweekNumber !== null && (
                            <span className="font-normal text-gray-400"> - GW {activeGameweekNumber}</span>
                        )}
                    </h2>

                    {leadingBids.length === 0 ? (
                        <p className="text-sm text-gray-400">No active transfer bids this window</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {leadingBids.map(b => (
                                <div
                                    key={b.id}
                                    className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                                            {b.playerImage && (
                                                <Image src={b.playerImage} alt={b.playerName} fill className="object-contain" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{b.playerName}</p>
                                            <p className="text-xs text-gray-400">
                                                {b.teamName} leads
                                                {b.competingBids > 1 && ` - ${b.competingBids} bids`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-semibold text-blue-700">{fmtM(b.amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right - completed transactions by gameweek */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-medium text-gray-900">Completed</h2>
                        {gameweekOptions.length > 0 && (
                            <select
                                value={selectedGameweekId ?? ''}
                                onChange={e => router.push(`${pathname}?gw=${e.target.value}`)}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {gameweekOptions.map(g => (
                                    <option key={g.id} value={g.id}>
                                        GW {g.gameweekNumber}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {history.length === 0 ? (
                        <p className="text-sm text-gray-400">No completed transactions for this gameweek</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {history.map(item => (
                                <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-gray-900 truncate">{item.teamName}</p>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <span className="text-[10px] uppercase tracking-wide text-gray-400">
                                                {item.kind === 'bid' ? 'Bid' : 'Waiver'}
                                            </span>
                                            <span
                                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                    item.status === 'won'
                                                        ? 'bg-green-50 text-green-700'
                                                        : item.status === 'invalidated'
                                                        ? 'bg-amber-50 text-amber-600'
                                                        : 'bg-gray-100 text-gray-400'
                                                }`}
                                            >
                                                {item.status}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">
                                        <span className={item.status === 'won' ? 'text-green-600' : 'text-gray-400'}>
                                            {item.playerAddedName}
                                        </span>
                                        {item.playerDroppedName && (
                                            <span className="text-red-500"> - {item.playerDroppedName}</span>
                                        )}
                                        {item.amount !== null && (
                                            <span className="text-blue-700"> - {fmtM(item.amount)}</span>
                                        )}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}