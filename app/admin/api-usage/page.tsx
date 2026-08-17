import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ApiUsageViewer from './ApiUsageViewer'
import { getStartOfCurrentMonth } from '@/lib/apiCallBudgetCalculation'

export default async function ApiUsagePage() {
  const { userId } = await auth()
  if (!userId) notFound()

  const currentUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!currentUser?.isSiteAdmin) notFound()

  const startOfMonth = getStartOfCurrentMonth()

  // Current month's usage by source, from live raw logs
  const currentMonthLogs = await prisma.apiCallLog.groupBy({
    by: ['source'],
    where: { calledAt: { gte: startOfMonth } },
    _count: { id: true }
  })

  const currentMonthTotal = currentMonthLogs.reduce((sum, g) => sum + g._count.id, 0)

  // Most recent remaining value across any call this month (real Sportmonks quota)
  const mostRecentCall = await prisma.apiCallLog.findFirst({
    where: { calledAt: { gte: startOfMonth }, remainingAfterCall: { not: null } },
    orderBy: { calledAt: 'desc' },
    select: { remainingAfterCall: true, calledAt: true }
  })

  // Historical monthly summaries (past, already rolled up)
  const historicalSummaries = await prisma.apiUsageMonthlySummary.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 60, // 5 years worth of source-month rows, generous cap
  })

  // Recent raw log entries for a live activity feed
  const recentLogs = await prisma.apiCallLog.findMany({
    orderBy: { calledAt: 'desc' },
    take: 25,
  })

  return (
    <ApiUsageViewer
      currentMonthBySource={currentMonthLogs.map(g => ({ source: g.source, count: g._count.id }))}
      currentMonthTotal={currentMonthTotal}
      remaining={mostRecentCall?.remainingAfterCall ?? null}
      remainingAsOf={mostRecentCall?.calledAt.toISOString() ?? null}
      historicalSummaries={historicalSummaries.map(s => ({
        year: s.year,
        month: s.month,
        source: s.source,
        totalCalls: s.totalCalls,
      }))}
      recentLogs={recentLogs.map(l => ({
        id: l.id,
        endpoint: l.endpoint,
        source: l.source,
        triggeredBy: l.triggeredBy,
        remainingAfterCall: l.remainingAfterCall,
        calledAt: l.calledAt.toISOString(),
      }))}
    />
  )
}