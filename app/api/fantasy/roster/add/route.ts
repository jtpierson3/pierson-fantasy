import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { error } from 'console'
import { sendStatusCode } from 'next/dist/server/api-utils'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({ where: { clerkId } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { fantasyTeamId, playerId, dropPlayerId } = await req.json()

        //Verify the fantasy team belongs to this user
        const fantasyTeam = await prisma.fantasyTeam.findFirst({
            where: { id: fantasyTeamId, userId: user.id },
            include: {
                players: true
            }
        })
        if (!fantasyTeam) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

        // Check Roster Limit
        const rosteredCount = fantasyTeam.players.filter(p => p.rosterSlot !== 'IR').length
        if (rosteredCount >= 23 && !dropPlayerId) {
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