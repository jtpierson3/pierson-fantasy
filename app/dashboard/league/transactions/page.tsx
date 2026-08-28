import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getActiveWaiverGameweek } from '@/lib/fixtureTiming'
import { getLeagueStandings } from '@/lib/leagueStandings'
import { leadingBidsByPlayer } from '@/lib/transferBidActivity'
import TransactionsView, { type HistoryItem } from './TransactionsView'

const CLAIM_DONE = ['won', 'lost', 'invalidated']
const BID_DONE = ['won', 'lost']

export default async function TransactionsPage({
    searchParams,
}: {
    searchParams: Promise<{ gw?: string }>
}) {
    const { gw } = await searchParams

    const { userId } = await auth()
    if (!userId) redirect('/sign-in')
    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) redirect('/sign-in')

    const myTeam = await prisma.fantasyTeam.findFirst({ where: { userId: user.id } })
    if (!myTeam) {
        return (
            <div className="p-6">
                <h1 className="text-xl font-medium text-gray-900 mb-2">Transactions</h1>
                <p className="text-sm text-gray-500">You do not have a team yet.</p>
            </div>
        )
    }

    const leagueId = myTeam.fantasyLeagueId

    // -------------------- LEFT: Current windows leading transfer bids ---------------------
    const activeGw = await getActiveWaiverGameweek(leagueId)

    const leagueTeams = await prisma.fantasyTeam.findMany({
        where: { fantasyLeagueId: leagueId },
        select: { id: true, name: true, totalLeaguePoints: true, totalFantasyPoints: true },
    })
    const standings = getLeagueStandings(leagueTeams)
    const teamNameById = new Map(leagueTeams.map(t => [t.id, t.name]))

    const livePendingBids = activeGw
        ? await prisma.transferBid.findMany({
            where: {
                status: 'pending',
                gameweekId: activeGw.id,
                fantasyTeam: { fantasyLeagueId: leagueId },
            },
            include: { player: { select: { display_name: true, image_path: true } } },
        })
        : []

    const leading = leadingBidsByPlayer(
        livePendingBids.map(b => ({
            id: b.id,
            fantasyTeamId: b.fantasyTeamId,
            playerId: b.playerId,
            amount: b.amount,
        })),
        standings.map(s => ({ id: s.team.id, rank: s.rank })),
    )

    const leadingBids = Array.from(leading.values())
        .map(({ bid, competingBids }) => {
            const full = livePendingBids.find(b => b.id === bid.id)!
            return {
                id: bid.id,
                playerName: full.player.display_name,
                playerImage: full.player.image_path,
                teamName: teamNameById.get(bid.fantasyTeamId) ?? 'Unknown',
                amount: bid.amount,
                competingBids,
            }
        })
        .sort((a, b) => b.amount - a.amount)

    // ------------------- RIGHT: Completed Transactions by Gameweek ------------------
    const gameweekOptions = await prisma.fantasyGameweek.findMany({
        where: {
            fantasyLeagueId: leagueId,
            OR: [
                { waiverClaims: { some: { status: { in: CLAIM_DONE } } } },
                { transferBids: { some: { status: { in: BID_DONE } } } },
            ],
        },
        select: { id: true, gameweekNumber: true },
        orderBy: { gameweekNumber: 'desc' },
    })

    const selectedGameweekId = gw && gameweekOptions.some(g => g.id === gw) ? gw: gameweekOptions[0]?.id ?? null

    let history: HistoryItem[] = []
    if (selectedGameweekId) {
        const [claims, bids] = await Promise.all([
            prisma.waiverClaim.findMany({
                where: {
                    gameweekId: selectedGameweekId,
                    status: { in: CLAIM_DONE },
                    fantasyTeam: { fantasyLeagueId: leagueId },
                },
                include: {
                    fantasyTeam: { select: { name: true } },
                    playerToAdd: { select: { display_name: true } },
                    playerToDrop: { select: { display_name: true } },
                },
                orderBy: { processedAt: 'desc' },
            }),
            prisma.transferBid.findMany({
                where: {
                    gameweekId: selectedGameweekId,
                    status: { in: BID_DONE },
                    fantasyTeam: { fantasyLeagueId: leagueId },
                },
                include: {
                    fantasyTeam: { select: { name: true } },
                    player: { select: { display_name: true } },
                },
                orderBy: { processedAt: 'desc' },
            }),
        ])

        const dropIds = Array.from(
            new Set(bids.map(b => b.playerToDropId).filter((v): v is number => v !== null))
        )

        const dropPlayers = dropIds.length
            ? await prisma.player.findMany({
                where: { id: { in: dropIds } },
                select: { id: true, display_name: true },
            })
            : []

        const dropNameById = new Map(dropPlayers.map(p => [p.id, p.display_name]))

        history = [
            ...claims.map(c => ({
                id: `claim:${c.id}`,
                kind: 'claim' as const,
                teamName: c.fantasyTeam.name,
                playerAddedName: c.playerToAdd.display_name,
                playerDroppedName: c.playerToDrop?.display_name ?? null,
                status: c.status,
                amount: null,
                processedAt: (c.processedAt ?? c.submittedAt).toISOString(),
            })),
            ...bids.map(b => ({
                id: `bid:${b.id}`,
                kind: 'bid' as const,
                teamName: b.fantasyTeam.name,
                playerAddedName: b.player.display_name,
                playerDroppedName: b.playerToDropId ? dropNameById.get(b.playerToDropId) ?? null : null,
                status: b.status,
                amount: b.amount,
                processedAt: (b.processedAt ?? b.submittedAt).toISOString(),
            })),
        ].sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime())
    }

    return (
        <TransactionsView
            activeGameweekNumber={activeGw?.gameweekNumber ?? null}
            leadingBids={leadingBids}
            gameweekOptions={gameweekOptions}
            selectedGameweekId={selectedGameweekId}
            history={history}
        />
    )
}
