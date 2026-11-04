import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import MyTeam from './myTeam'
import { redirect } from 'next/navigation'
import { mergeLineupWithSnapshot } from '@/lib/lineupSnapshot'
import { selectTargetGameweek } from '@/lib/gameweekSelection'
import { getActiveSidelinedForPlayers } from '@/lib/playerSidelined'
import { getWaiverClaimBadge } from '@/lib/waiverClaimStatus'
import { getWaiverPriorityOrder } from '@/lib/waiverPriorityOrder'
import { computeGameweekLockTimes, COMPETITION_TO_FIXTURE_KEY } from '@/lib/gameweekSelection'
import { summarizePlayerCompetition } from '@/lib/waiverContext'

function MyTeamSkeleton() {
  return (
    <div className="p-6">
      <div className='h-6 w-32 bg-gray-100 rounded animate-pulse mb-6'/>
      <div className='flex gap-4 mb-6'>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-32 bg-gray-100 rounded animate-pulse mb-6"/>
        ))}
      </div>
      <div className="h-96 bg-gray-100 rounded-xl animate-pulse"/>
    </div>
  )
}

async function MyTeamContent() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: {clerkId: userId},
  })

  if (!user) redirect('/sign-in')

  const fantasyTeam = await prisma.fantasyTeam.findFirst({
    where: { userId: user.id },
    include: {
      players: {
        include: {
          player: {
            include: { team: true }
          }
        },
        orderBy: {slotOrder: 'asc'}
      },
      fantasyLeague: true
    }
  })

  if (!fantasyTeam) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-medium text-gray-900 mb-2">My Team</h1>
        <p className ="text-sm text-gray-500">
          You dont have a team yet. Talk to an admin to assign you a team.
        </p>
      </div>
    )
  }

  const leagueId = fantasyTeam.fantasyLeagueId
  const rosterPlayerIds = fantasyTeam.players.map(p => p.playerId)

  const [leagueTeams, sidelinedMap, myClaimsRaw, myBidsRaw, allGameweeks, lastSnapshot] = await Promise.all([
    prisma.fantasyTeam.findMany({
      where: { fantasyLeagueId: leagueId },
      select: { id: true, totalLeaguePoints: true, totalFantasyPoints: true, draftPosition: true },
    }),
    getActiveSidelinedForPlayers(rosterPlayerIds),
    prisma.waiverClaim.findMany({
      where: { fantasyTeamId: fantasyTeam.id, status: 'pending' },
      include: { playerToAdd: { include: { team: true } }, playerToDrop: true },
      orderBy: { rank: 'asc' },
    }),
    prisma.transferBid.findMany({
      where: { fantasyTeamId: fantasyTeam.id, status: 'pending' },
      include: { player: { include: { team: true } } },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.fantasyGameweek.findMany({
      where: { fantasyLeagueId: leagueId },
      orderBy: { gameweekNumber: 'asc' },
    }),
    prisma.gameweekLineup.findFirst({
      where: { fantasyTeamId: fantasyTeam.id },
      include: { players: true },
      orderBy: { lockedAt: 'desc' },
    }),
  ])

  const waiverOrder = getWaiverPriorityOrder(leagueTeams)
  const myWaiverPos = waiverOrder.get(fantasyTeam.id) ?? Number.MAX_SAFE_INTEGER

  const sidelinedByPlayerId: Record<number, { category: string; typeName: string; endDate: string | null }> = {}
  for (const [playerId, info] of sidelinedMap.entries()) {
    sidelinedByPlayerId[playerId] ={
      category: info.category,
      typeName: info.typeName,
      endDate: info.endDate?.toISOString() ?? null,
    }
  }

  const contestedPlayerIds = [
    ...new Set([
      ...myClaimsRaw.map(c => c.playerToAddId),
      ...myBidsRaw.map(b => b.playerId),
    ])
  ]

  const fixtureKeys = [...new Set(allGameweeks.map(gw => COMPETITION_TO_FIXTURE_KEY[gw.competition]))]
  const rangeStart = allGameweeks.reduce<Date | null>((min, gw) => (min === null || gw.startDate < min ? gw.startDate : min), null)
  const rangeEnd = allGameweeks.reduce<Date | null>((max, gw) => (max === null || gw.endDate > max ? gw.endDate : max), null)

  const [leagueClaims, leagueBidsRaw, fixtureKickoffs] = await Promise.all([
    contestedPlayerIds.length === 0
      ? Promise.resolve([])
      : prisma.waiverClaim.findMany({
          where: {
            playerToAddId: { in: contestedPlayerIds },
            status: 'pending',
            fantasyTeam: { fantasyLeagueId: leagueId },
            NOT: { fantasyTeamId: fantasyTeam.id },
          },
          select: { playerToAddId: true, fantasyTeamId: true },
      }),
    contestedPlayerIds.length === 0
      ? Promise.resolve([])
      : prisma.transferBid.findMany({
          where: {
            playerId: { in: contestedPlayerIds },
            status: 'pending',
            fantasyTeam: { fantasyLeagueId: leagueId },
          },
          orderBy: { amount: 'desc' },
          select: { playerId: true, amount: true, fantasyTeamId: true, fantasyTeam: { select: { name: true } } },
      }),
    rangeStart && rangeEnd
      ? prisma.fixture.findMany({
          where: {
            competition: { in: fixtureKeys },
            kickoff: { gte: rangeStart, lte: rangeEnd },
          },
          select: { kickoff: true, competition: true },
      })
      : Promise.resolve([]),
  ])

  const leagueBids = leagueBidsRaw.map(b => ({
    playerId: b.playerId,
    amount: b.amount,
    fantasyTeamId: b.fantasyTeamId,
    fantasyTeamName: b.fantasyTeam.name,
  }))

  const myClaims = myClaimsRaw.map(claim => {
    const comp = summarizePlayerCompetition({
      myTeamId: fantasyTeam.id,
      playerId: claim.playerToAddId,
      leagueClaims,
      leagueBids,
    })

    const badge = getWaiverClaimBadge({
      myWaiverPriority: myWaiverPos,
      competingClaimPriorities: comp.competingClaimTeamIds.map(id => waiverOrder.get(id) ?? Number.MAX_SAFE_INTEGER),
      hasForeignBid: comp.hasForeignBid,
      projectedBidWinnerIsMe: comp.projectedBidWinnerIsMe,
    })

    return {
      id: claim.id,
      rank: claim.rank,
      status: claim.status,
      submittedAt: claim.submittedAt.toISOString(),
      player: {
        id: claim.playerToAdd.id,
        display_name: claim.playerToAdd.display_name,
        image_path: claim.playerToAdd.image_path,
      },
      playerToDrop: claim.playerToDrop
        ? { display_name: claim.playerToDrop.display_name }
        : null,
      badge,
      hasOtherClaims: comp.competingClaimTeamIds.length > 0,
      currentHighBid: comp.highBid?.amount ?? null,
      currentHighBidderName: comp.highBid?.fantasyTeamName ?? null,
      myBidAmount: comp.myBid?.amount ?? null,
      hasForeignBid: comp.hasForeignBid,
    }
  })

  const gameweeksWithLockInfo = computeGameweekLockTimes(allGameweeks, fixtureKickoffs)
  const targetGameweekInfo = selectTargetGameweek(gameweeksWithLockInfo, new Date())
  const targetGameweek = targetGameweekInfo
    ? allGameweeks.find(gw => gw.id === targetGameweekInfo.id) ?? null
    : null
  const targetGameweekLockTime = targetGameweekInfo?.lockTime ?? null

  const mergedPlayers = mergeLineupWithSnapshot(
    fantasyTeam.players.map(p => ({ id: p.id, playerId: p.playerId })),
    lastSnapshot?.players.map(p => ({
      playerId: p.playerId,
      rosterSlot: p.rosterSlot,
      slotOrder: p.slotOrder,
    })) ?? null
  )

  // Merge the computed rosterSlot/slotOrder back onto the full player objects
  // (mreged players only has ids/ slot info, we need full player+team data for render)
  const mergedFantasyTeamPlayers = fantasyTeam.players.map(p => {
    const merged = mergedPlayers.find(m => m.id === p.id)
    return {
      ...p,
      rosterSlot: (merged?.rosterSlot ?? p.rosterSlot) as typeof p.rosterSlot,
      slotOrder: merged?.slotOrder ?? p.slotOrder
    }
  })

  const teamForLineup = {
    ...fantasyTeam,
    players: mergedFantasyTeamPlayers,
    formation: lastSnapshot?.formation ?? fantasyTeam.formation,
  }

  const myBids = myBidsRaw.map(bid => {
    const comp = summarizePlayerCompetition({
      myTeamId: fantasyTeam.id,
      playerId: bid.playerId,
      leagueClaims: [],
      leagueBids,
    })

    return {
      id: bid.id,
      playerId: bid.playerId,
      playerName: bid.player.display_name,
      playerImage: bid.player.image_path,
      myAmount: bid.amount,
      currentHighAmount: comp.highBid?.amount ?? bid.amount,
      currentHighBidderName: comp.highBid?.fantasyTeamName ?? fantasyTeam.name,
      isWinning: comp.highBid?.fantasyTeamId === fantasyTeam.id,
    }
  })

  const lockedFunds = myBidsRaw.reduce((sum, b) => sum + b.amount, 0)
  const availableFunds = fantasyTeam.fundsBalance - lockedFunds

  return <MyTeam 
    fantasyTeam={teamForLineup} 
    myClaims={myClaims} 
    myBids={myBids}
    availableFunds={availableFunds}
    targetGameweek={targetGameweek}
    targetGameweekLockTime={targetGameweekLockTime?.toISOString() ?? null}
    sidelinedByPlayerId={sidelinedByPlayerId}
  />
}

export default function MyTeamPage() {
  return(
    <Suspense fallback={<MyTeamSkeleton />}>
      <MyTeamContent />
    </Suspense>
  )
}