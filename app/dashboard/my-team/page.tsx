import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import MyTeam from './myTeam'
import { redirect } from 'next/navigation'
import { getGameweekLockTime } from '@/lib/fixtureTiming'
import { mergeLineupWithSnapshot } from '@/lib/lineupSnapshot'
import { selectTargetGameweek } from '@/lib/gameweekSelection'
import { getActiveSidelinedForPlayers } from '@/lib/playerSidelined'

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

  const rosterPlayerIds = fantasyTeam.players.map(p => p.playerId)
  const sidelinedMap = await getActiveSidelinedForPlayers(rosterPlayerIds)

  const sidelinedByPlayerId: Record<number, { category: string; typeName: string; endDate: string | null }> = {}
  for (const [playerId, info] of sidelinedMap.entries()) {
    sidelinedByPlayerId[playerId] = {
      category: info.category,
      typeName: info.typeName,
      endDate: info.endDate?.toISOString() ?? null
    }
  }

  // Fetch pending claims for this team
  const myClaimsRaw = await prisma.waiverClaim.findMany({
    where: { fantasyTeamId: fantasyTeam.id, status: 'pending' },
    include: {
      playerToAdd: { include: { team: true } },
      playerToDrop: true,
    },
    orderBy: { rank: 'asc' }
  })

  // For each claim, compute leading/losing against competing claims
  const myClaims = await Promise.all(
    myClaimsRaw.map(async claim => {
      const competingClaims = await prisma.waiverClaim.findMany({
        where: {
          playerToAddId: claim.playerToAddId,
          status: 'pending',
          fantasyTeam: { fantasyLeagueId: fantasyTeam.fantasyLeagueId }
        },
        include: { fantasyTeam: true }
      })

      const bestPriority = Math.min(...competingClaims.map(c => c.fantasyTeam.waiverPriority))
      const isLeading = fantasyTeam.waiverPriority === bestPriority

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
        isLeading,
        competingClaimsCount: competingClaims.length,
      }
    })
  )

  // Determine which gameweek is currently being set = the earliest gameweek
  // Whose locktime hasnt passed yet
  const allGameweeks = await prisma.fantasyGameweek.findMany({
    where: { fantasyLeagueId: fantasyTeam.fantasyLeagueId },
    orderBy: { gameweekNumber: 'asc' }
  })

  const gameweeksWithLockInfo = await Promise.all(
    allGameweeks.map(async gw => ({
      id: gw.id,
      gameweekNumber: gw.gameweekNumber,
      lockTime: await getGameweekLockTime(gw)
    }))
  )

  const targetGameweekInfo = selectTargetGameweek(gameweeksWithLockInfo, new Date())
  const targetGameweek = targetGameweekInfo
    ? allGameweeks.find(gw => gw.id === targetGameweekInfo.id) ?? null
    : null
  const targetGameweekLockTime = targetGameweekInfo?.lockTime ?? null

  // Load the most recent locked in snapshot (if any) to merge as the starting point
  const lastSnapshot = await prisma.gameweekLineup.findFirst({
    where:  { fantasyTeamId: fantasyTeam.id },
    include: { players: true },
    orderBy: { lockedAt: 'desc' }
  })

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

  // Fetch this team's active transfer bids, plus league wide context for each
  const myBidsRaw = await prisma.transferBid.findMany({
    where: { fantasyTeamId: fantasyTeam.id, status: 'pending' },
    include: {
      player: { include: { team: true } }
    },
    orderBy: { submittedAt: 'desc' }
  })

  const myBids = await Promise.all(
    myBidsRaw.map(async bid => {
      const highestBid = await prisma.transferBid.findFirst({
        where: {
          playerId: bid.playerId,
          status: 'pending',
          fantasyTeam: { fantasyLeagueId: fantasyTeam.fantasyLeagueId }
        },
        include: { fantasyTeam: { include: { user: true } } },
        orderBy: { amount: 'desc' }
      })

      return {
        id: bid.id,
        playerId: bid.playerId,
        playerName: bid.player.display_name,
        playerImage: bid.player.image_path,
        myAmount: bid.amount,
        currentHighAmount: highestBid?.amount ?? bid.amount,
        currentHighBidderName: highestBid?.fantasyTeam.name ?? fantasyTeam.name,
        isWinning: highestBid?.fantasyTeamId === fantasyTeam.id
      }
    })
  )

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