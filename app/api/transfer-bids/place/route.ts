import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { validateBidAmount } from '@/lib/transferBidValuation'
import { getActiveWaiverGameweek } from '@/lib/fixtureTiming'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({ where: { clerkId } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { fantasyTeamId, playerId, amount, playerToDropId } = await req.json()

        const team = await prisma.fantasyTeam.findFirst({
            where: { id: fantasyTeamId, userId: user.id },
            include: { players: true }
        })
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

        // Check player isn't already rostered
        const alreadyRostered = await prisma.fantasyTeamPlayer.findFirst({
            where: {
                playerId,
                fantasyTeam: { fantasyLeagueId: team.fantasyLeagueId }
            }
        })
        if (alreadyRostered) {
            return NextResponse.json({ error: 'Player is already on a team' }, { status: 400 })
        }

        // Roster fullness check - same rule as normal waivers
        const rosteredCount = team.players.filter(p => p.rosterSlot !== 'IR').length
        if (rosteredCount >= 23 && !playerToDropId) {
            return NextResponse.json({ error: 'Roster full - must select a player to drop' }, { status: 400 })
        }
        if (playerToDropId) {
            const dropPlayerOnTeam = team.players.some(p => p.playerId === playerToDropId)
            if (!dropPlayerOnTeam) {
                return NextResponse.json({ error: 'Player to drop is not on your team' }, { status: 400 })
            }
        }

        // current gameweek
        const currentGameweek = await getActiveWaiverGameweek(team.fantasyLeagueId)
        if (!currentGameweek) {
            return NextResponse.json({ error: 'No active gameweek found' }, { status: 400 })
        }

        // Calculate this team's available (unlocked) funds - total balance minus
        // the sum of their currently-active highest bids on OTHER players
        const activeBids = await prisma.transferBid.findMany({
            where: { fantasyTeamId, status: 'pending' }
        })
        const existingBidOnThisPlayer = activeBids.find(b => b.playerId === playerId)
        const lockedInOtherBids = activeBids
            .filter(b => b.playerId !== playerId)
            .reduce((sum, b) => sum + b.amount, 0)

        const availableFunds = team.fundsBalance - lockedInOtherBids

        // Determine the current highest bid on this player (from anyone in the league)
        const currentHighBid = await prisma.transferBid.findFirst({
            where: {
                playerId,
                status: 'pending',
                fantasyTeam: { fantasyLeagueId: team.fantasyLeagueId }
            },
            orderBy: { amount: 'desc' }
        })

        const validation = validateBidAmount(
            amount,
            currentHighBid?.amount ?? null,
            availableFunds
        )

        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 })
        }

        // Upsert this team's bid on this player (raising their own existing bid or creating a new bid)
        if (existingBidOnThisPlayer) {
            await prisma.transferBid.update({
                where: { id: existingBidOnThisPlayer.id },
                data: { amount, playerToDropId: playerToDropId || null }
            })
        } else {
            await prisma.transferBid.create({
                data: {
                    fantasyTeamId,
                    playerId,
                    gameweekId: currentGameweek.id,
                    amount,
                    playerToDropId: playerToDropId || null,
                    status: 'pending'
                }
            })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[transfer-bids/place] error:', err)
        return NextResponse.json({ error: 'Failed to place bid' }, { status: 500 })
    }
}