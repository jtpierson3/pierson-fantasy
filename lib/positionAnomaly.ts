import { getPositionType, toScoringPosition } from '@/lib/formations'
import { toBroadPositionId } from '@/lib/positions';

export type PositionAnomaly = 'unexpected-position' | 'missing-position' | null

export function checkPositionAnomaly(
    player: { position_id: number | null; detailed_position_id: number | null },
    positionPlayedId: number | null,
    minutesPlayed: number
): PositionAnomaly {
    // player didn't play --- nothing to flag
    if (minutesPlayed <= 0) return null

    const broadPositionPlayedId = toBroadPositionId(positionPlayedId)
    const playedType = getPositionType(positionPlayedId, broadPositionPlayedId)
    const playedBucket = toScoringPosition(playedType)

    if (!playedBucket) return 'missing-position'

    const storedType = getPositionType(player.detailed_position_id, player.position_id)
    const storedBucket = toScoringPosition(storedType)

    if (!storedBucket) return null

    if (storedBucket !== playedBucket) return 'unexpected-position'

    return null
}