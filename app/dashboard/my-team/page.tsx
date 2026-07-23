import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import MyTeam from './myTeam'
import { redirect } from 'next/navigation'
import { getGameweekLockTime } from '@/lib/fixtureTiming'
import { mergeLineupWithSnapshot } from '@/lib/lineupSnapshot'
import { selectTargetGameweek } from '@/lib/gameweekSelection'

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
      lockTime: await getGameweekLockTime(gw.startDate, gw.endDate)
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

  return <MyTeam 
    fantasyTeam={teamForLineup} 
    myClaims={myClaims} 
    targetGameweek={targetGameweek}
    targetGameweekLockTime={targetGameweekLockTime?.toISOString() ?? null}
  />
}

export default function MyTeamPage() {
  return(
    <Suspense fallback={<MyTeamSkeleton />}>
      <MyTeamContent />
    </Suspense>
  )
}