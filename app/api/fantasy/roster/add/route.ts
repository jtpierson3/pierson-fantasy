import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MAX_NON_IR_ROSTER } from '@/lib/leagueRules'
import { requireUser } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireUser()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        const user = authResult.user

        const { fantasyTeamId, playerId, dropPlayerId } = await req.json()

        //Verify the fantasy team belongs to this user
        const fantasyTeam = await prisma.fantasyTeam.findFirst({
            where: { id: fantasyTeamId, userId: user.id },
            include: {
                players: true,
                fantasyLeague: { select: { draftComplete: true } },
            }
        })
        if (!fantasyTeam) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

        // Free-Agent adds are only for the draft, after it, players come through waiver claims
        if (fantasyTeam.fantasyLeague.draftComplete) {
            return NextResponse.json({ error: 'The draft is complete, use a waiver claim to add players' }, { status: 400 })
        }

        // Check Roster Limit
        const rosteredCount = fantasyTeam.players.filter(p => p.rosterSlot !== 'IR').length
        if (rosteredCount >= MAX_NON_IR_ROSTER && !dropPlayerId) {
            return NextResponse.json({ error: 'Roster full - drop a player first' }, { status: 400 })
        }

        // Check Player isn't already rostered in this league
        const alreadyRostered = await prisma.fantasyTeamPlayer.findFirst({
            where: {
                playerId,
                fantasyTeam: { fantasyLeagueId: fantasyTeam.fantasyLeagueId }
            }
        })
        if (alreadyRostered) {
            return NextResponse.json({ error: 'Player already on a team' }, { status: 400})
        }

        await prisma.$transaction(async tx => {
            // Drop player if needed
            if (dropPlayerId) {
                await tx.fantasyTeamPlayer.deleteMany({
                    where: { 
                        fantasyTeamId, 
                        playerId: parseInt(dropPlayerId) 
                    }
                })
            }

            // Add new player
            await tx.fantasyTeamPlayer.create({
                data: { 
                    fantasyTeamId,
                    playerId: parseInt(playerId),
                    rosterSlot: 'RESERVE'
                }
            })
        })
        
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[roster/add] error:', err)
        return NextResponse.json({ error: 'Failed to add player' }, { status: 500})
    }
}