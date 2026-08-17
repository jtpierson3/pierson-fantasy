import { describe, it, expect } from 'vitest'
import { normalizeForSearch } from './textNormalization'

describe('normalizeForSearch', () => {
  it('strips accents so accented and unaccented versions match', () => {
    expect(normalizeForSearch('João')).toBe('joao')
    expect(normalizeForSearch('Joao')).toBe('joao')
  })

  it('handles multiple accented characters in one name', () => {
    expect(normalizeForSearch('Rúben Días')).toBe('ruben dias')
  })

  it('leaves plain ASCII text unaffected aside from lowercasing', () => {
    expect(normalizeForSearch('Bukayo Saka')).toBe('bukayo saka')
  })

  it('handles a variety of common diacritics', () => {
    expect(normalizeForSearch('Müller')).toBe('muller')
    expect(normalizeForSearch('Çağlar')).toBe('caglar')
    expect(normalizeForSearch('Núñez')).toBe('nunez')
  })
})