"use client"

import { useEffect, useState } from "react"

type Participant = {
    id: number
    name: string
    image_path: string
    meta: { location: 'home' | 'away' }
}

type Score = {
    score: { goals: number; participant: 'home' | 'away' }
    description: string
}

type Fixture = {
    id: number
    starting_at: string
    name: string
    state: { name: string; short_name: string; developer_name: string }
    venue: { name: string; city_name: string } | null
    round: { name: string }
    participants: Participant[]
    scores: Score[]
}

type Round = {
    id: number
    name: string
    starting_at: string
    ending_at: string
}

function getScore(scores: Score[], location: 'home' | 'away') {
    const current = scores?.filter(s => s.description === 'CURRENT')
    return current?.find(s => s.score.participant === location)?.score.goals ?? null
}

function getTeam(participants: Participant[], location: 'home' | 'away') {
    return participants?.find(p => p.meta.location === location)
}

function getStatusStyle(state: string) {
    if (state === 'FT' || state === 'AET' || state === 'FT_PEN') 
        return 'bg-gray-100 text-gray-500'

    if (['1H', '2H', 'ET', 'HT', 'LIVE'].includes(state)) 
        return 'bg-green-100 text-green-700'
    
    return 'bg-blue-50 text-blue-600'
}

function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return {
        day: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
        time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    }
}

const isLiveState = (state: string) => ['1H', '2H', 'ET', 'HT', 'LIVE'].includes(state)
const isFinishedState = (state: string) => ['FT', 'AET', 'FT_PEN'].includes(state)

export default function FixturesPage() {
    const [fixtures, setFixtures] = useState<Fixture[]>([])
    const [rounds, setRounds] = useState<Round[]>([])
    const [currentRoundId, setCurrentRoundId] = useState<number | null>(null)
    const [seasonId, setSeasonId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch season and rounds on mount
    useEffect(() => {
        async function init() {
            try {
                const seasonRes = await fetch('/api/sportmonks/season')
                const seasonData = await seasonRes.json()
                const season = seasonData.data?.current_season
                if (!season) throw new Error ('No season found')

                setSeasonId(seasonId)

                const roundsRes = await fetch(`/api/sportmonks/rounds?seasonId=${season.id}`)
                const roundsData = await roundsRes.json()
                const allRounds: Round[] = roundsData.data ?? []
                setRounds(allRounds)

                // Find current round based on today's date
                const today = new Date()
                const current = allRounds.find(r => {
                    const start = new Date (r.starting_at)
                    const end = new Date(r.ending_at)
                    return today >= start && today <= end
                }) ?? allRounds[allRounds.length - 1]

                setCurrentRoundId(current?.id ?? allRounds[0]?.id)
            } catch (err) {
                setError('Failed to load season dadta')
                setLoading(false)
            }
        }
        init()
    }, [])

    // Fetch fixtures when round changes
    useEffect(() => {
        if (!currentRoundId || !seasonId) return

        async function fetchFixtures() {
            setLoading(true)
            setError(null)
            try{
                const res = await fetch(`/api/sportmonks/fixtures?round=${currentRoundId}&seasonId=${seasonId}`)
                const data = await res.json()
                setFixtures(data.data ?? [])
            } catch {
                setError('Failed to load fixtures')
            } finally {
                setLoading(false)
            }
        }

    }, [currentRoundId, seasonId])

    const currentRoundIndex = rounds.findIndex(r => r.id === currentRoundId)
    const currentRound = rounds[currentRoundIndex]

    function prevRound() {
        if (currentRoundIndex > 0) {
            setCurrentRoundId(rounds[currentRoundIndex - 1].id)
        }
    }

    function nextRound() {
        if (currentRoundIndex < rounds.length - 1) {
            setCurrentRoundId(rounds[currentRoundIndex + 1].id)
        }
    }

    return (
        <div className="p-6 max-w-3xl mx-auto">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-medium text-gray-900">Fixtures</h1>
                    <p className="text-sm text-gray-500 mt-1">Scottish Premiership 2024/25</p>
                </div>

                {/* Round navigator */}
                {rounds.length > 0 && currentRound && (
                    <div className="flex items-cetner gap-2">
                        <button
                            onClick={prevRound}
                            disabled={currentRoundIndex === 0}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            '
                        </button>
                        <span className="text-sm font-medium text-gray-700 min-w-[90px] text-center">
                            {currentRound.name}
                        </span>
                        <button
                            onClick={nextRound}
                            disabled={currentRoundIndex === rounds.length-1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 test-gray-500 hover:bg-gray disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            '
                        </button>
                    </div>
                )}
            </div>

            {/* Loading skeletons */}
            {loading && (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 animate-pulse">
                            <div className="h-3 bg-gray-100 rounded w-1/4 mb-4"/>
                            <div className="flex items-center justify-between">
                                <div className="h-4 bg-gray-100 rounded w-1/3" />
                                <div className="h-6 bg-gray-100 rounded w-16"/>
                                <div className="h-4 bg-gray-100 rounded w-1/3"/>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Fixtures */}
            {!loading && !error && (
                <div className="space-y-3">
                    {fixtures.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-8">
                            No fixtures found for this round.
                        </p>
                    )}

                    {fixtures.map((fixture => {
                        const home = getTeam(fixture.participants, 'home')
                        const away = getTeam(fixture.participants, 'away')
                        const homeScore = getScore(fixture.scores, 'home')
                        const awayScore = getScore(fixture.scores, 'away')
                        const state = fixture.state?.short_name ?? 'NS'
                        const isLive = isLiveState(state)
                        const isFinished = isFinishedState(state)
                        const {day, time} = formatDate(fixture.starting_at)

                        return(
                            <div
                                key={fixture.id}
                                className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
                            >
                                {/* Date and Status Row */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-gray-400">{day} * {time}</span>
                                    <div className="flex items-center gap-2">
                                        {fixture.venue && (
                                            <span className="text-xs text-gray-400">
                                                {fixture.venue.name}
                                            </span>
                                        )}
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusStyle(state)}`}>
                                            {isLive ? 'LIVE' : state}
                                        </span>
                                    </div>
                                </div>

                                {/* Teams and Score */}
                                <div className="flex items-center gap-3">
                                    {/* Home Team*/}
                                    <div className="flex items-center gap-2 flex-1 justify-end">
                                        <span className={`text-sm ${isFinished && homeScore! > awayScore! ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                            {home?.name ?? 'TBD'}
                                        </span>
                                        {home?.image_path && (
                                            <img 
                                                src={home.image_path}
                                                alt={home.name}
                                                className="w-6 h-6 object-contain"
                                            />
                                        )}
                                    </div>

                                    {/* Score or VS */}
                                    <div className="flex items-center gap-1.5 min-w-[60px] justify-center">
                                        {isFinished || isLive ? (
                                            <>
                                                <span className="text-lg font-medium text-gray-900">{homeScore}</span>
                                                <span className="text-gray-300">-</span>
                                                <span className="text-lg font-medium text-gray-900">{awayScore}</span>
                                            </>
                                        ) : (
                                            <span className="text-sm text-gray-400">vs</span>
                                        )}
                                    </div>

                                    {/* Away Team */}
                                    <div className="flex items-center gap-2 flex-1">
                                        {away?.image_path && (
                                            <img 
                                                src={away.image_path}
                                                alt={away.name}
                                                className="w-6 h-6 object-contain"
                                            />
                                        )}
                                        <span className={`text-sm ${isFinished && awayScore! > homeScore! ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                            {away?.name ?? 'TBD'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    }))}
                </div>
            )}

        </div>
    )
}