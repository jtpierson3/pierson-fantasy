import { describe, it, expect } from 'vitest'
import { nameSimilarity } from './nameMatching'

describe('nameSimilarity', () => {
  it('scores an exact match as 1.0', () => {
    expect(nameSimilarity('Bryan Mbeumo', 'Bryan Mbeumo')).toBe(1)
  })

  it('scores a partial name (just last name) as a strong match', () => {
    expect(nameSimilarity('Bryan Mbeumo', 'Mbeumo')).toBe(1)
  })

  it('is accent and case insensitive', () => {
    expect(nameSimilarity('Rafa Leao', 'Rafael Leão')).toBeGreaterThanOrEqual(0.5)
  })

  it('scores unrelated names low', () => {
    expect(nameSimilarity('Bryan Mbeumo', 'Bruno Fernandes')).toBe(0)
  })

  it('handles reversed name order reasonably', () => {
    const score = nameSimilarity('Bruno Fernandes', 'Fernandes Bruno')
    expect(score).toBe(1)
  })
})