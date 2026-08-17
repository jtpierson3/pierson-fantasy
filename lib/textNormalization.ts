/**
 * Normalizes a string for diacritic-insensitive comparaison - e.g. "Joao" 
 * not yielding Joao Gomes as a result because of a tilde over the A
 * Used for search filters where users may not type accented characters
 * even when the stored data has them.
 */
export function normalizeForSearch(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip combining diacritical marks
        .toLowerCase()
}