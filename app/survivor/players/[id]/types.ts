import type { Prisma } from '@prisma/client'

export type PlayerWithDetails = Prisma.SurvivorPlayerGetPayload<{
    include: {
        contestants: {
            include: {
                survivorSeason: true
                tribeMemberships: { include: { tribe: true } }
                challengeResults: {
                    include: {
                        challenge: { include: { episode: true } }
                    }
                }
                sitOuts: {
                    include: {
                        challenge: { include: { episode: true } }
                    }
                }
                votesReceived: {
                    where: { isRevoked: false }
                    include: {
                        voter: { include: { survivorPlayer: true } }
                        tribalCouncil: { include: { episode: true } }
                    }
                }
                votesGiven: {
                    include: {
                        votedFor: { include: { survivorPlayer: true } }
                        tribalCouncil: { include: { episode: true } }
                    }
                }
                episodeStats: {
                    include: {
                        event: true
                        episode: true
                    }
                }
            }
        }
    }
}>

export type ContestantWithDetails = PlayerWithDetails['contestants'][0]