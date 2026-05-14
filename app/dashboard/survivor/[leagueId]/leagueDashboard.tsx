'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

type SurvivorPlayer = {
    id: string
    name: string
    imageUrl: string | null
}

type ScoringEvent = {
    points: number
}

type Episode = {
    id: string
    number: number
    name: string
    isAired: boolean
    isMerge: boolean
    isFinale: boolean
}

type EpisodeStat = {
    id: string
    episode: Episode
    event: ScoringEvent
}

type Contestant = {
    id: string
    status: string
    survivorPlayer: SurvivorPlayer
    episodeStats: EpisodeStat[]
}

type SurvivorPick = {
    id: string
    contestant: Contestant
}

type User = {
    id: string
    username: string
}

type Tribe = {
    id: string
    name: string
    userId: string
    user: User
    players: SurvivorPick[]
}

type Season = {
    id: string
    number: number
    title: string
    imageUrl: string | null
    isActive: boolean
    episodes: Episode[]
}

type League = {
    id: string
    name: string
    survivorSeason: Season
    members: { id: string; user: User}[]
    tribes: Tribe[]
}

type PastLeague = {
    id: string
    name: string
    survivorSeason: Season
    tribes: Tribe[]
}

type Props = {
    league: League
    userId: string
    pastLeagues: PastLeague[]
}

export default function LeagueDashboard({ league, userId, pastLeagues }: Props) {
    return (
        <div></div>
    )
}