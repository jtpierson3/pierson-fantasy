'use client'

import CurrentMatchupTile from "./CurrentMatchupTile"
import { type MatchupSummary } from '@/lib/matchupHelpers'
import { useState } from 'react'

type CupSlide = {
    competition: 'league_cup' | 'domestic_cup'
    gameweekNumber: number
    cupPointsTotal: number | null
}

type Props = {
    matchup: MatchupSummary | null
    currentTeamId: string
    cupSlides: CupSlide[]
}

export default function CurrentCompetitionTile({ matchup, currentTeamId, cupSlides }: Props) {
    const [index, setIndex] = useState(0)
    const slideCount = 1 + cupSlides.length //slide 0 is always PL

    return (
        <div className="relative">
            {index === 0
                ? <CurrentMatchupTile matchup={matchup} currentTeamId={currentTeamId} />
                : <CurrentCupTile {...cupSlides[index-1]} />
            }
            {slideCount > 1 && (
                <>
                    <button onClick={() => setIndex(i => (i - 1 + slideCount) % slideCount)}>‹</button>
                    <button onClick={() => setIndex(i => (i + 1) % slideCount)}>›</button>
                </>
            )}
        </div>
    )
}