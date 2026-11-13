import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        const { leagueId } = await req.json()

        // Delete in order to respect foreign keys

        // GameweekLineupPlayer depends on Gameweek Lineup
        await prisma.gameweekLineupPlayer.deleteMany({
            where: { GameweekLineup: { fantasyTeam: { fantasyLeagueId: leagueId } } }
        })
        await prisma.gameweekLineup.deleteMany({
            where: { fantasyTeam: { fantasyLeagueId: leagueId } }
        })

        // Waiver Claim depends on FantasyTeam + Fantasy Gameweek
        await prisma.waiverClaim.deleteMany({
            where: { fantasyTeam: { fantasyLeagueId: leagueId } }
        })

        // Transfer Bid depends on FantasyTeam + Fantasy Gameweek
        await prisma.transferBid.deleteMany( {
            where: { fantasyTeam: { fantasyLeagueId: leagueId } }
        })

        // PlayerTransfer depends on a nullable FK
        await prisma.playerTransfer.updateMany({
            where: { formerFantasyTeam : { fantasyLeagueId: leagueId } },
            data: { formerFantasyTeamId: null}
        })


        await prisma.fantasyTeamPlayer.deleteMany({
            where: { fantasyTeam: { fantasyLeagueId: leagueId }}
        })
        await prisma.fantasyMatchup.deleteMany({
            where: { gameweek: { fantasyLeagueId: leagueId }}
        })
        await prisma.fantasyGameweek.deleteMany({
            where: { fantasyLeagueId: leagueId }
        })
        await prisma.fantasyTeam.deleteMany({
            where: { fantasyLeagueId: leagueId }
        })
        await prisma.fantasyLeagueMember.deleteMany({
            where: { fantasyLeagueId: leagueId }
        })
        await prisma.fantasyLeague.deleteMany({
            where: { id: leagueId }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[delete-league] error: ', err)
        return NextResponse.json({ error: 'Failed to delete league' }, { status: 500})
    }
}