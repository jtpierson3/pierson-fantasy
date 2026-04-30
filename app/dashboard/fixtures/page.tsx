import { Suspense } from 'react'
import { getCurrentSeason, getRounds, getFixturesByRound } from '@/lib/sportmonks'
import type { Fixture, Round } from '@/lib/sportmonks'
import FixtureList from './fixtureList'

function FixturesSkeleton() {
    return (
        <div className="p-6 max-w-3x1 mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
                    <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mt-2" />
                </div>
                <div className="h-8 w-36 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="space-y-3">
                {[...Array(5).map((_, i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 animate-pulse">
                        <div className="h-3 bg-gray-100 rounded w-1/4 mb-4" />
                        <div className="flex items-center justify-between">
                            <div className="h-4 bg-gray-100 rounded w-1/3" />
                            <div className="h-4 bg-gray-100 rounded w-16" />
                            <div className="h-4 bg-gray-100 rounded w-1/3" />
                        </div>
                    </div>
                ))]}
            </div>
        </div>
    )
}

async function FixturesContent() {
    const season = await getCurrentSeason()

    if (!season) {
        return (
            <div className="p-6">
                <p className="text-sm text-red-500">Failed to load season data.</p>
            </div>
        )
    }

    const allRounds: Round[] = await getRounds(season.id)

    const sortedRounds = [...allRounds].sort((a,b) =>
        new Date(a.starting_at).getTime() - new Date(b.starting_at).getTime()
    )

    const today = new Date()
    const currentRound = sortedRounds.find(r => r.is_current)
        ?? sortedRounds.find(r => {
        const start = new Date(r.starting_at)
        const end = new Date(r.ending_at)
        return today >= start && today <= end
        })
        ?? sortedRounds.filter(r => r.finished).pop()
        ?? sortedRounds[0]

        const initialFixtures: Fixture[] = currentRound
            ? await getFixturesByRound(currentRound.id)
            : []

    return (
        <FixtureList
            rounds={sortedRounds}
            initialFixtures={initialFixtures}
            initialRoundId={currentRound?.id ?? null}
            seasonId={season.id}
        />
    )
}

export default function FixtuesPage() {
    return (
        <Suspense fallback={<FixturesSkeleton />}>
            <FixturesContent />
        </Suspense>
    )
}