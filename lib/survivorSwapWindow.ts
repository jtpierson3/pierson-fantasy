export type SwapWindowEpisode = {
    number: number
    isMerge: boolean
    isAired: boolean
}

export type SwapWindow = 
    | { open: true }
    | { open: false; reason: 'no-merge' | 'closed' }

/**
 * The one-time merge swap can happen once the merge episode has aired, and only until the
 * next episode after it airs.
 */
export function getSwapWindow(episodes: SwapWindowEpisode[]): SwapWindow {
    const ordered = [...episodes].sort((a, b) => a.number - b.number)

    const mergeEpisode = ordered.find(e => e.isMerge && e.isAired)
    if (!mergeEpisode) return { open: false, reason: 'no-merge'}

    const nextEpisode = ordered.find(e => e.number > mergeEpisode.number)
    if (nextEpisode?.isAired) return { open: false, reason: 'closed' }

    return { open: true }
}

export const SWAP_WINDOW_MESSAGES = {
    'no-merge': 'Merge has not happened yet',
    'closed': 'Swap window has closed',
} as const