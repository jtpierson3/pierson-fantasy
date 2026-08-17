export type RawCallForRollup = {
    id: string
    source: string
    calledAt: Date
}

export type RollupGroup = {
    year: number
    month: number
    source: string
    totalCalls: number
    logIds: string[]
}

/**
 * Given raw ApiCallLog rows, groups them by (year, month, source) and counts totals.
 * Pure - takes plain data, returns plain data. The caller is reponsible for deciding 
 * which rows to pass in (e.g. only those older than the retention window) and for 
 * persisting the results.
 */
export function groupCallsForRollup(logs: RawCallForRollup[]): RollupGroup[] {
    const groups = new Map<string, RollupGroup>()

    for (const log of logs) {
        const year = log.calledAt.getUTCFullYear()
        const month = log.calledAt.getUTCMonth() + 1 // 1 -indexed
        const key = `${year}-${month}-${log.source}`

        const existing = groups.get(key)
        if (existing) {
            existing.totalCalls++
            existing.logIds.push(log.id)
        } else {
            groups.set(key, {
                year,
                month,
                source: log.source,
                totalCalls: 1,
                logIds: [log.id]
            })
        }
    }

    return Array.from(groups.values())
}

/**
 * Returns the cutoff date - anything older than this should be rolled up
 * and removed from the raw log. Defaults to 3 months before "now".
 */
export function getRollupCutoffDate(now: Date = new Date(), monthsToKeep: number = 3): Date {
    const cutoff = new Date(now)
    cutoff.setMonth(cutoff.getMonth() - monthsToKeep)
    return cutoff
}