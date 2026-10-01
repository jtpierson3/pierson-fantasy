import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/apiAuth'
import { isGameweekLocked } from '@/lib/fixtureTiming'
import { validateLineupSubmission } from '@/lib/lineupValidation'

export async function POST(req: Request) {
    try {
        const authResult = await requireUser()
        if (!authResult.ok) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }
        const { user } = authResult

        const { fantasyTeamId, gameweekId, formation, players } = await req.json()
        if (typeof fantasyTeamId !== 'string' || typeof gameweekId !== 'string') {
            return NextResponse.json({ error: 'fantasyTeamId and gameweekId are required' }, { status: 400 })
        }

        const team = await prisma.fantasyTeam.findFirst({
            where: { id: fantasyTeamId, userId: user.id },
            include: { players: { select: { id: true, playerId: true } } },
        })
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

        const gameweek = await prisma.fantasyGameweek.findFirst({
            where: { id: gameweekId, fantasyLeagueId: team.fantasyLeagueId },
        })
        if (!gameweek) return NextResponse.json({ error: 'Gameweek not found' }, { status: 404 })

        // Cup gameweeks score off the live roster rather than a saved lineup so there is nothing for a 
        // user to set for them.
        if (gameweek.competition !== 'premier_league') {
            return NextResponse.json({ error: 'Lineups can only be set for Premier League Gameweeks' }, { status: 400 })
        }

        // Server clock vs kickoff (stored UTC) - independent of user's timezone.
        if (await isGameweekLocked(gameweek)) {
            return NextResponse.json({ error: 'This gameweek is locked' }, { status: 403 })
        }

        const result = validateLineupSubmission(formation, players, team.players)
        if (!result.valid) return NextResponse.json({ error: result.error }, { status: 400 })
        const { formation: validFormation, players: validPlayers } = result

        await prisma.$transaction(async tx => {
            await tx.fantasyTeam.update({
                where: { id: team.id },
                data: { formation: validFormation },
            })

            // Live roster state
            for (const p of validPlayers) {
                await tx.fantasyTeamPlayer.update({
                    where: { id: p.id },
                    data: { rosterSlot: p.rosterSlot, slotOrder: p.slotOrder },
                })
            }

            // Gameweek snapshot: replace player rows, then upsert the lineup itself
            await tx.gameweekLineupPlayer.deleteMany({
                where: { GameweekLineup: { fantasyTeamId: team.id, gameweekId } },
            })
            const snapshotPlayers = validPlayers.map(p => ({
                playerId: p.playerId,
                rosterSlot: p.rosterSlot,
                slotOrder: p.slotOrder,
            }))
            await tx.gameweekLineup.upsert({
                where: { fantasyTeamId_gameweekId: { fantasyTeamId: team.id, gameweekId } },
                update: {
                    formation: validFormation,
                    lockedAt: new Date(),
                    players: { create: snapshotPlayers },
                },
                create: {
                    fantasyTeamId: team.id,
                    gameweekId,
                    formation: validFormation,
                    players: { create: snapshotPlayers },
                }
            })
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[my-team/lineup] error:', err)
        return NextResponse.json({ error: 'Failed to save lineup' }, { status: 500 })
    }
}