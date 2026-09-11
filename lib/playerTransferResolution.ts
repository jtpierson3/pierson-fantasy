import { Transfer } from '@/lib/sportmonks'

export function resolveLatestTransferPerPlayer(
    transfers: Transfer[],
    trackedTeamIds: Set<number>
): Map<number, Transfer> {
    const latestByPlayer = new Map<number, Transfer>()

    for (const transfer of transfers) {
        if (!transfer.completed) continue

        const fromTracked = transfer.from_team_id !== null && trackedTeamIds.has(transfer.from_team_id)
        const toTracked = transfer.to_team_id !== null && trackedTeamIds.has(transfer.to_team_id)
        if (!fromTracked && !toTracked) continue

        const existing = latestByPlayer.get(transfer.player_id)
        if (!existing || new Date(transfer.date).getTime() > new Date(existing.date).getTime()) {
            latestByPlayer.set(transfer.player_id, transfer)
        }
    }

    return latestByPlayer
}