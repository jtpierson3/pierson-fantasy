import { NextResponse } from "next/server"
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        
        const currentUser = await prisma.user.findUnique({
            where: { clerkId }
        })
        if (!currentUser?.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

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
            where: { formerFantasyTeam : { fantasyLeague: leagueId } },
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