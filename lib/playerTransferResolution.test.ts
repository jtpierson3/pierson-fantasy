import { describe, it, expect } from 'vitest'
import { resolveLatestTransferPerPlayer } from './playerTransferResolution'
import { Transfer } from '@/lib/sportmonks'

function makeTransfer(overrides: Partial<Transfer>): Transfer {
    return {
        id: 1,
        player_id: 1,
        type_id: 219,
        from_team_id: null,
        to_team_id: null,
        date: '2026-09-01',
        completed: true,
        amount: null,
        ...overrides,
    }
}

describe('resolveLatestTransferPerPlayer', () => {
    it('keeps a transfer to a tracked team', () => {
        const tracked = new Set([9])
        const transfers = [makeTransfer({ player_id: 1, from_team_id: 18, to_team_id: 9 })]
        const result = resolveLatestTransferPerPlayer(transfers, tracked)
        expect(result.get(1)?.to_team_id).toBe(9)
    })

    it('drops a transfer between two untracked teams', () => {
        const tracked = new Set([9])
        const transfers = [makeTransfer({ player_id: 1, from_team_id: 625, to_team_id: 109 })]
        const result = resolveLatestTransferPerPlayer(transfers, tracked)
        expect(result.has(1)).toBe(false)
    })

    it('excludes incomplete transfers', () => {
        const tracked = new Set([9])
        const transfers = [makeTransfer({ player_id: 1, from_team_id: 9, completed: false })]
        const result = resolveLatestTransferPerPlayer(transfers, tracked)
        expect(result.has(1)).toBe(false)
    })

    it('keeps the later transfer when a player has two in window', () => {
        const tracked = new Set([9, 18])
        const transfers = [
            makeTransfer({ player_id: 1, from_team_id: 18, to_team_id: 9, date: '2026-09-01' }),
            makeTransfer({ player_id: 1, from_team_id: 9, to_team_id: 18, date: '2026-09-05' })
        ]
        const result = resolveLatestTransferPerPlayer(transfers, tracked)
        expect(result.get(1)?.to_team_id).toBe(18)
    })

    it('keeps a transfer where only from_team_id is tracked', () => {
        const tracked = new Set([20])
        const transfers = [makeTransfer({ player_id: 1, from_team_id: 20, to_team_id: 625 })]
        const result = resolveLatestTransferPerPlayer(transfers, tracked)
        expect(result.get(1)?.to_team_id).toBe(625)
    })
})