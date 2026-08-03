import { describe, it, expect } from 'vitest'
import { getCurrentClub, type SportmonksTeamStint } from './playerTeamResolution'

function stint(
    teamId: number,
    teamName: string,
    type: 'domestic' | 'national',
    start: string | null,
    end: string | null
): SportmonksTeamStint {
    return {
        team_id: teamId,
        start,
        end,
        team: { id: teamId, name: teamName, image_path: null, type }
    }
}

const NOW = new Date('2026-08-15T00:00:00Z')

describe('getCurrentClub', () => {
    it('returns null when there are no team stints at all', () => {
        expect(getCurrentClub([], NOW)).toBeNull()
    })

    it('returns null when the player only has national team stints', () => {
        const teams = [stint(1, 'Brazil', 'national', '2020-01-01', null)]
        expect(getCurrentClub(teams, NOW)).toBeNull()
    })

    it('returns the single domestic club when only one exists', () => {
        const teams = [
            stint(1, 'Real Madrid', 'domestic', '2024-07-01', null),
            stint(2, 'Brazil', 'national', '2020-01-01', null)
        ]
        expect(getCurrentClub(teams, NOW)?.name).toBe('Real Madrid')
    })

    it('falls back to the most recent start date when multiple stints are ambiguous', () => {
        const teams = [
            stint(1, 'Old Club', 'domestic', '2018-01-01', null),
            stint(2, 'New Club', 'domestic', '2024-07-01', null)
        ]
        expect(getCurrentClub(teams, NOW)?.name).toBe('New Club')
    })

    it('Returns null when no stint is active at all', () => {
        const teams = [
            stint(1, 'Earlier Club', 'domestic', '2019-01-01', '2021-06-30'),
            stint(2, 'Later Club', 'domestic', '2021-07-01', '2023-06-30')
        ]
        expect(getCurrentClub(teams, NOW)).toBeNull()
    })
})