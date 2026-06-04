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
              include: { tribe: true }
            }
          }
        }
        event: true
      }
    }
    challenges: {
      include: {
        survivorChallenge: true
        sitOuts: {
          include: {
            contestant: {
              include: { survivorPlayer: true }
            }
          }
        }
        results: {
          include: {
            contestant: {
              include: {
                survivorPlayer: true
                tribeMemberships: {
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
                  include: { tribe: true }
                }
              }
            }
            votedFor: {
              include: {
                survivorPlayer: true
                tribeMemberships: {
                  include: { tribe: true }
                }
              }
            }
          }
        }
        eliminated: {
          include: {
            survivorPlayer: true
            tribeMemberships: {
              include: { tribe: true }
            }
          }
        }
      }
    }
  }
}>