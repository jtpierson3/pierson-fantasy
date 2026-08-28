import { describe, it, expect } from 'vitest'
import { getWaiverPriorityOrder } from './waiverPriorityOrder'

const t = (id: string, lp: number, fp: number, draft: number | null) =>
    ({ id, totalLeaguePoints: lp, totalFantasyPoints: fp, draftPosition: draft })

describe('getWaiverPriorityOrder', () => {
    it('worst standings claims first', () => {
        const order = getWaiverPriorityOrder([t('A', 9, 900, 1), t('B', 3, 300, 2), t('C', 6, 600, 3)])
        expect([...order.entries()].sort((a,b) => a[1] - b[1]).map(e => e[0])).toEqual(['B', 'C', 'A'])
    })

    it('pre-week-1 (all 0-0): pure inverse draft order - first pick claims last', () => {
        const order = getWaiverPriorityOrder([t('P1', 0, 0, 1), t('P2', 0, 0, 2), t('P3', 0, 0, 3)])
        expect(order.get('P3')).toBe(1)
        expect(order.get('P1')).toBe(3)
    })

    it('league points tie broken by fantasy points (fewer = earlier)', () => {
        const order = getWaiverPriorityOrder([t('A', 5, 400, 1), t('B', 5, 200, 2)])
        expect(order.get('B')).toBe(1)
    })

    it('full standings tie broken by draft position', () => {
        const order = getWaiverPriorityOrder([t('A', 5, 100, 1), t('B', 5, 100, 4)])
        expect(order.get('B')).toBe(1)
    })

    it('deterministic when even draft position ties', () => {
        const a = getWaiverPriorityOrder([t('x', 0, 0, null), t('y', 0, 0, null)])
        const b = getWaiverPriorityOrder([t('y', 0, 0, null), t('x', 0, 0, null)])
        expect([...a]).toEqual([...b])
    })

    it('does not mutate input', () => {
        const teams = [t('A', 5, 0, 1), t('B', 9, 0, 2)]
        const snap = JSON.stringify(teams)
        getWaiverPriorityOrder(teams)
        expect(JSON.stringify(teams)).toBe(snap)
    })
})