import { describe, it, expect } from 'vitest'
import { calculatePlayerPoints, type ScoringRuleInput, type PlayerStatsInput } from './scoringCalculation'

function rule(overrides: Partial<ScoringRuleInput>): ScoringRuleInput {
  return {
    statKey: 'TEST',
    displayName: 'Test Stat',
    statTypeId: 999,
    position: 'ST',
    pointsPerUnit: 1,
    isGraduated: false,
    tiers: null,
    ...overrides,
  }
}

describe('calculatePlayerPoints', () => {
  it('always includes match rating as the base score', () => {
    const stats: PlayerStatsInput = { stats: {}, rating: 6.78, minutesPlayed: 90 }
    const result = calculatePlayerPoints(stats, [], false)
    expect(result.totalPoints).toBe(6.78)
    expect(result.breakdown[0]).toEqual({ label: 'Match Rating (base)', points: 6.78 })
  })

  it('applies a flat per-unit rule based on the stat count', () => {
    const stats: PlayerStatsInput = { stats: { '52': 2 }, rating: 7, minutesPlayed: 90 }
    const rules = [rule({ statKey: 'GOAL', displayName: 'Goal', statTypeId: 52, pointsPerUnit: 9 })]
    const result = calculatePlayerPoints(stats, rules, false)
    expect(result.totalPoints).toBe(7 + 18) // rating + 2 goals * 9
  })

  it('skips a rule when the stat is not present in the raw data', () => {
    const stats: PlayerStatsInput = { stats: {}, rating: 6, minutesPlayed: 90 }
    const rules = [rule({ statKey: 'GOAL', statTypeId: 52, pointsPerUnit: 9 })]
    const result = calculatePlayerPoints(stats, rules, false)
    expect(result.totalPoints).toBe(6)
    expect(result.breakdown).toHaveLength(1) // only the rating line
  })

  it('awards clean sheet points only when isCleanSheet is true', () => {
    const stats: PlayerStatsInput = { stats: {}, rating: 6, minutesPlayed: 90 }
    const rules = [rule({ statKey: 'CLEAN_SHEET', displayName: 'Clean Sheet', statTypeId: null, pointsPerUnit: 6 })]

    const withCS = calculatePlayerPoints(stats, rules, true)
    expect(withCS.totalPoints).toBe(12) // 6 rating + 6 clean sheet

    const withoutCS = calculatePlayerPoints(stats, rules, false)
    expect(withoutCS.totalPoints).toBe(6) // rating only
  })

  it('applies negative flat rules correctly (e.g. yellow card)', () => {
    const stats: PlayerStatsInput = { stats: { '84': 1 }, rating: 7, minutesPlayed: 90 }
    const rules = [rule({ statKey: 'YELLOW_CARD', statTypeId: 84, pointsPerUnit: -3 })]
    const result = calculatePlayerPoints(stats, rules, false)
    expect(result.totalPoints).toBe(4) // 7 - 3
  })

  it('resolves a graduated rule to the correct tier', () => {
    const tiers = [
      { min: 90, points: 3 },
      { min: 80, points: 2 },
      { min: 70, points: 1 },
      { min: 0, points: 0 },
    ]
    const stats: PlayerStatsInput = { stats: { '1584': 85 }, rating: 6, minutesPlayed: 90 }
    const rules = [rule({ statKey: 'PASSING_ACCURACY', statTypeId: 1584, isGraduated: true, tiers, pointsPerUnit: null })]
    const result = calculatePlayerPoints(stats, rules, false)
    expect(result.totalPoints).toBe(8) // 6 rating + 2 for the 80-89 tier
  })

  it('gives zero points for a graduated rule below the lowest positive tier', () => {
    const tiers = [
      { min: 90, points: 3 },
      { min: 80, points: 2 },
      { min: 70, points: 1 },
      { min: 0, points: 0 },
    ]
    const stats: PlayerStatsInput = { stats: { '1584': 50 }, rating: 6, minutesPlayed: 90 }
    const rules = [rule({ statKey: 'PASSING_ACCURACY', statTypeId: 1584, isGraduated: true, tiers, pointsPerUnit: null })]
    const result = calculatePlayerPoints(stats, rules, false)
    expect(result.totalPoints).toBe(6) // rating only, 0-tier not added to breakdown
  })

  it('handles the touch stat correctly at its small decimal weight', () => {
    const stats: PlayerStatsInput = { stats: { '120': 45 }, rating: 6, minutesPlayed: 90 }
    const rules = [rule({ statKey: 'TOUCH', statTypeId: 120, pointsPerUnit: 0.05 })]
    const result = calculatePlayerPoints(stats, rules, false)
    expect(result.totalPoints).toBe(8.25) // 6 + 45*0.05
  })
})