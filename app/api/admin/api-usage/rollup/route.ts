import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRollupCutoffDate, groupCallsForRollup } from '@/lib/apiUsageRollup'
import { requireAutomationSecret } from '@/lib/automationAuth'
import type { ApiCallSource } from '@prisma/client'

export async function POST(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    try {
        const cutoff = getRollupCutoffDate()

        const oldLogs = await prisma.apiCallLog.findMany({
            where: { calledAt: { lt: cutoff } },
            select: { id: true, source: true, calledAt: true }
        })

        if (oldLogs.length === 0) {
            return NextResponse.json({ success: true, message: 'No logs old enough to rollup', rolledUp: 0 })
        }

        const groups = groupCallsForRollup(oldLogs)

        for (const group of groups) {
            const existing = await prisma.apiUsageMonthlySummary.findUnique({
                where: {
                    year_month_source: {
                        year: group.year,
                        month: group.month,
                        source: group.source as ApiCallSource,
                    }
                }
            })

            if (existing) {
                await prisma.apiUsageMonthlySummary.update({
                    where: { id: existing.id },
                    data: { totalCalls: { increment: group.totalCalls } }
                })
            } else {
                await prisma.apiUsageMonthlySummary.create({
                    data: {
                        year: group.year,
                        month: group.month,
                        source: group.source as ApiCallSource,
                        totalCalls: group.totalCalls
                    }
                })
            }
        }

        const allLogIdsToDelete = groups.flatMap(g => g.logIds)
        await prisma.apiCallLog.deleteMany({
            where: { id: { in: allLogIdsToDelete } }
        })

        return NextResponse.json({
            success: true,
            message: `Rolled up ${allLogIdsToDelete.length} log(s) into ${groups.length} monthly summary group(s)`,
            rolledUp: allLogIdsToDelete.length,
            groupsUpdated: groups.length
        })

    } catch (err) {
        console.error('[api-usage/rollup] error: ', err)
        return NextResponse.json({ error: 'Failed to roll up API usage logs' }, { status: 500 })
    }
}