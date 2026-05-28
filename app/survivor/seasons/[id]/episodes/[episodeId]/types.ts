import type { Prisma } from '@prisma/client'

export type EpisodeWithDetails = Prisma.EpisodeGetPayload<{
    include: {
        survivorSeason: {
            include: {
                episodes: {
                    select: { id: true; number: true; name: true; isAired: true }
                }
            }
        }
        stats: {
            include: {
                contestant: {
                    include: {
                        survivorPlayer: true
                        tribeMemberships: {
                            where: { isCurrent: true }
                            include: { tribe: true }
                        }
                    }
                }
                event: true
            }
        }
        challenges: {
            include: {
                results: {
                    include: {
                        contestant: {
                            include: {
                                survivorPlayer: true
                                tribeMemberships: {
                                    where: { isCurrent: true }
                                    include: { tribe: true }
                                }
                            }
                        }
                        team: true
                    }
                }
                teams: {
                    include: {
                        contestants: { include: { survivorPlayer: true } }
                        result: true
                    }
                }
            }
        }
        tribalCouncils: {
            include: {
                votes: {
                    include: {
                        voter: {
                            include: {
                                survivorPlayer: true
                                tribeMemberships: {
                                    where: { isCurrent: true }
                                    include: { tribe: true }
                                }
                            }
                        }
                    }
                }
                eliminated: {
                    include: {
                        survivorPlayer: true
                        tribeMembership: {
                            where: { isCurrent: true }
                            include: { tribe: true }
                        }
                    }
                }
            }
        }
    }
}>