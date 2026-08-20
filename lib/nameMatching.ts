import { normalizeForSearch } from './textNormalization'

/**
 * Returns a rough similarity score (0-1) between the two player names, based on word overlap
 * after normalization (accent/case-insensitive). Not a formal edit-distance algorith - just 
 * checks what fractions of the shorter name's words appear in the longer name. Good enough
 * to flag likely matches for human review, not meant to auto-confirm anything.
 */
export function nameSimilarity(nameA: string, nameB: string): number {
    const wordsA = normalizeForSearch(nameA).split(/\s+/).filter(Boolean)
    const wordsB = normalizeForSearch(nameB).split(/\s+/).filter(Boolean)

    if (wordsA.length === 0 || wordsB.length === 0) return 0

    const [shorter, longer] = wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA]
    const longerSet = new Set(longer)

    const matchingWords = shorter.filter(w => longerSet.has(w)).length
    return matchingWords / shorter.length
}