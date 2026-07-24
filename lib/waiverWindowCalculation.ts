const LOCK_HOURS_BEFORE_KICKOFF = 2
const EARLY_KICKOFF_HOUR_THRESHOLD = 10

/**
 * Given a fixture's kickoff time, computes when the waiver window closes.
 * Normal case: 2 hours before kickoff
 * Early kickoff (before 10am): closes at 5pm the previous evening instead,
 * since a 2 hour before cutoff. on an early kickoff leaves too small a window in
 * waking hours to set a lineup.
 */
export function calculateWaiverCloseTime(kickoff: Date): Date {
    const kickoffCopy = new Date(kickoff)

    if (kickoffCopy.getHours() < EARLY_KICKOFF_HOUR_THRESHOLD) {
        const closesAt = new Date(kickoffCopy)
        closesAt.setDate(closesAt.getDate() - 1)
        closesAt.setHours(17, 0,0,0)
        return closesAt
    }

    const closesAt = new Date(kickoffCopy)
    closesAt.setHours(closesAt.getHours() - LOCK_HOURS_BEFORE_KICKOFF)
    return closesAt
}