import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { isWaiverWindowClosed } from '@/lib/waiverWindow'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({ where: { clerkId } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { fantasyTeamId, playerToAddId, playerToDropId } = await req.json()

        if (await isWaiverWindowClosed()) {
            return NextResponse.json({ error: 'Waiver window is currently closed' }, { status: 400 })
        }

        const fantasyTeam = await prisma.fantasyTeam.findFirst({
            where: { id: fantasyTeamId, userId: user.id },
            include: { players: true }
        })
        if (!fantasyTeam) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

        // Check player isn't already rostered
        const alreadyRostered = await prisma.fantasyTeamPlayer.findFirst({
            where: {
                playerId: playerToAddId,
                fantasyTeam: { fantasyLeagueId: fantasyTeam.fantasyLeagueId }
            }
        })
        if (alreadyRostered) {
            return NextResponse.json({ error: 'Player is already on a team' }, { status: 400 })
        }

        // Check roster fullness - require a drop if at 23 non-IR players
        const rosteredCount = fantasyTeam.players.filter(p => p.rosterSlot !== 'IR').length
        if (rosteredCount >= 23 && !playerToDropId) {
            return NextResponse.json({ error: 'Roster full - must select player to drop' }, { status: 400 })
        }

        // If dropping, verify that the player is actually on this team
        if (playerToDropId) {
            const dropPlayerOnTeam = fantasyTeam.players.some(p => p.playerId === playerToDropId)
            if (!dropPlayerOnTeam) {
                return NextResponse.json({ error: 'Player to drop is not on your team' }, { status: 400 })
            }
        }

        // Find the current gameweek to tie the claim to
        const currentGameweek = await prisma.fantasyGameweek.findFirst({
            where: { fantasyLeagueId: fantasyTeam.fantasyLeagueId, isCurrent: true }
        })
        if (!currentGameweek) { 
            return NextResponse.json({ error: 'No acitve gameweek found' }, { status: 400 })
        }

        // Prevent duplicate claim on same player by same team this gameweek
        const existingClaim = await prisma.waiverClaim.findFirst({
            where: {
                fantasyTeamId,
                playerToAddId,
                gameweekId: currentGameweek.id,
                status: 'pending',
            }
        })
        if (existingClaim) {
            return NextResponse.json({ error: 'You already have a pending claim on this player' }, { status: 400 })
        }

        // Before creating the claim, find the next available rank for this team
        const existingClaimsCount = await prisma.waiverClaim.count({
            where: { fantasyTeamId, status: 'pending' }
        })

        const claim = await prisma.waiverClaim.create({
            data: {
                fantasyTeamId,
                playerToAddId,
                playerToDropId: playerToDropId || null,
                gameweekId: currentGameweek.id,
                status: 'pending',
                rank: existingClaimsCount + 1
            }
        })

        return NextResponse.json({ success: true, claim })
    } catch (err) {
        console.error('[waivers/claim] error:', err)
        return NextResponse.json({ error: 'Failed to submit claim' }, { status: 500 })
    }
}