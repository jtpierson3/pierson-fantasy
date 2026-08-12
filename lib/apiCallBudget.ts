import { prisma } from '@/lib/prisma'
import type { ApiCallSource } from '@prisma/client'
import { getStartOfCurrentMonth, isWithinBudget } from '@/lib/apiCallBudgetCalculation'

export async function getCallsThisMonth(source?: ApiCallSource): Promise<number> {
    return prisma.apiCallLog.count({
        where: {
            ...(source ? { source } : {}),
            calledAt: { gte: getStartOfCurrentMonth() }
        }
    })
}

export async function logApiCall(
    endpoint: string,
    source: ApiCallSource,
    options?: { triggeredBy?: string; remainingAfterCall?: number | null}
): Promise<void> {
    await prisma.apiCallLog.create({ 
        data: {
            endpoint,
            source,
            triggeredBy: options?.triggeredBy ?? null,
            remainingAfterCall: options?.remainingAfterCall ?? null
        } 
    })
}

/**
 * Convenience combined check - returns wheter it's safe to make a call right now for the given endpoint
 */
export async function canMakeApiCall(source?: ApiCallSource): Promise<boolean> {
    const callsThisMonth = await getCallsThisMonth(source)
    return isWithinBudget(callsThisMonth)
}