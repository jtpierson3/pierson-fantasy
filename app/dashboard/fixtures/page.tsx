import { getCurrentSeason, getRounds, getFixturesByRound } from '@/lib/sportmonks'
import type { Fixture, Round } from '@/lib/sportmonks'
import FixtureList from './fixtureList'

export default async function FixturesPage() {
  const season = await getCurrentSeason()

  if (!season) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">Failed to load season data.</p>
      </div>
    )
  }

  const allRounds: Round[] = await getRounds(season.id)

  const sortedRounds = allRounds.sort((a, b) =>
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