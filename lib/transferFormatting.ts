import { TRANSFER_TYPES } from './sportmonksConstants'

export function transferTypeLabel(typeId: number | null): string {
    if (typeId === TRANSFER_TYPES.LOAN_TRANSFER) return 'Loan'
    if (typeId === TRANSFER_TYPES.TRANSFER) return 'Transfer'
    if (typeId === TRANSFER_TYPES.FREE_TRANSFER) return 'Free Transfer'
    if (typeId === TRANSFER_TYPES.END_OF_LOAN) return 'End of Loan'
    return 'Unknown'
}

export function formatCurrency(amount: number | null): string {
    if (amount === null) return '-'
    if (amount >= 1_000_000) return `£${(amount / 1_000_000).toFixed(1)}M`
    if (amount >= 1_000) return `£${(amount / 1_000).toFixed(0)}K`
    return `£${amount}`
}