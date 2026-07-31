import { prisma } from '@/lib/prisma'
import { getStartOfCurrentMonth, isWithinBudget } from '@/lib/apiCallBudgetCalculation'

export async function getCallsThisMonth(endpoint: string): Promise<number> {
    return prisma.apiCallLog.count({
        where: {
            endpoint,
            calledAt: { gte: getStartOfCurrentMonth() }
        }
    })
}

export async function logApiCall(endpoint: string): Promise<void> {
    await prisma.apiCallLog.create({ data: { endpoint } })
}

/**
 * Convenience combined check - returns wheter it's safe to make a call right now for the given endpoint
 */
export async function canMakeApiCall(endpoint: string): Promise<boolean> {
    const callsThisMonth = await getCallsThisMonth(endpoint)
    return isWithinBudget(callsThisMonth)
}