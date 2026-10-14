import { describe, it, expect } from 'vitest'
import { getSwapWindow, type SwapWindowEpisode } from './survivorSwapWindow'

const ep = (number: number, isMerge: boolean, isAired: boolean): SwapWindowEpisode =>
    ({ number, isMerge, isAired })

describe('getSwapWindow', () => {
    it('is closed with no-merge before the merge episode has aired', () => {
        expect(getSwapWindow([ep(1, false, true), ep(2, true, false),  ep(3, false, false)]))
            .toEqual({ open: false, reason: 'no-merge' })
    })

    it('is closed with no-merge when no episode is a merge', () => {
        expect(getSwapWindow([ep(1, false, true), ep(2, false, false)]))
            .toEqual({ open: false, reason: 'no-merge' })
    })

    it('is open once the merge has aired and the next episode has not', () => {
        expect(getSwapWindow([ep(1, false, true), ep(2, true, true),  ep(3, false, false)]))
            .toEqual({ open: true })
    })

    it('closes as soon as the episode after the merge has aired', () => {
        expect(getSwapWindow([ep(1, false, true), ep(2, true, true),  ep(3, false, true)]))
            .toEqual({ open: false, reason: 'closed' })
    })

    it('stays open when the merge is the last known episode', () => {
        expect(getSwapWindow([ep(1, false, true), ep(2, true, true)]))
            .toEqual({ open: true })
    })

    it('does not depend on the order episodes are passed in', () => {
        expect(getSwapWindow([ep(3, false, false), ep(2, true, true),  ep(1, false, true)]))
            .toEqual({ open: true })
    })
})