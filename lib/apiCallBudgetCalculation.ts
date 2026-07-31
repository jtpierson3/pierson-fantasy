const MONTHLY_CALL_BUDGET = 2000
const SAFETY_BUFFER = 200

export function getStartOfCurrentMonth(now: Date = new Date()): Date {
    const start = new Date(now)
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    return start
}

/**
 * Pure - given a raw count already fetched from the DB, determines whether
 * the endpoint is within its safe monthly budget.
 */
export function isWithinBudget(callsThisMonth: number): boolean {
    return callsThisMonth < MONTHLY_CALL_BUDGET - SAFETY_BUFFER
}