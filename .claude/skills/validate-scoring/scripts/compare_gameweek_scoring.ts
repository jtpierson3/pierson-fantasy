/**
 * Diagnostic-only comparison between the automated scoring pipeline and the
 * manually-entered FantasyMatchup scores for one fantasy gameweek.
 *
 * Automated path:  PlayerFixturePoints (keyed by playerId+fixtureId)
 *                   -> resolved via GameweekLineupPlayer.resolvedPlayerId (STARTER rows only)
 * Manual path:      FantasyMatchup.homePoints / awayPoints (hand-entered today)
 *
 * This script never writes anything. It only reads and reports discrepancies.
 *
 * Usage:
 *   npx tsx .claude/skills/validate-scoring/scripts/compare_gameweek_scoring.ts <fantasyGameweekId>
 */
async function main() {
    const dotenv = await import('dotenv')
    dotenv.config({ path: '.env.local' })
    const { prisma } = await import('@/lib/prisma')

    const gameweekId = process.argv[2]
    if (!gameweekId) {
        console.error('Usage: npx tsx compare_gameweek_scoring.ts <fantasyGameweekId>')
        process.exit(1)
    }

    const gameweek = await prisma.fantasyGameweek.findUnique({
        where: { id: gameweekId },
        include: {
            matchups: { include: { homeTeam: true, awayTeam: true } },
        },
    })
    if (!gameweek) {
        console.error(`No FantasyGameweek found with id ${gameweekId}`)
        process.exit(1)
    }

    async function computeAutomatedTotal(fantasyTeamId: string): Promise<{
        total: number
        lines: { playerId: number; name: string; points: number }[]
    }> {
        const lineup = await prisma.gameweekLineup.findUnique({
            where: { fantasyTeamId_gameweekId: { fantasyTeamId, gameweekId } },
            include: { players: true },
        })
        if (!lineup) return { total: 0, lines: [] }

        const starters = lineup.players.filter(
            (p) => p.rosterSlot === 'STARTER' && p.resolvedPlayerId != null
        )
        const resolvedIds = starters.map((p) => p.resolvedPlayerId as number)
        if (resolvedIds.length === 0) return { total: 0, lines: [] }

        // PlayerFixturePoints is keyed by fixture, not fantasy gameweek directly -
        // join through Fixture.gameweekNumber to line up with this fantasy gameweek.
        const points = await prisma.playerFixturePoints.findMany({
            where: {
                playerId: { in: resolvedIds },
                fixture: { gameweekNumber: gameweek.gameweekNumber },
            },
            include: { player: true },
        })

        const total = points.reduce((sum, p) => sum + p.points, 0)
        const lines = points.map((p) => ({
            playerId: p.playerId,
            name: p.player.display_name ?? String(p.playerId),
            points: p.points,
        }))
        return { total, lines }
    }

    console.log(`\nGameweek ${gameweek.gameweekNumber} (${gameweek.id}) — scoring comparison`)
    console.log('='.repeat(70))

    let mismatchCount = 0

    for (const matchup of gameweek.matchups) {
        for (const side of ['home', 'away'] as const) {
            const team = side === 'home' ? matchup.homeTeam : matchup.awayTeam
            const manualPoints = side === 'home' ? matchup.homePoints : matchup.awayPoints
            const { total: automatedPoints, lines } = await computeAutomatedTotal(team.id)
            const delta = automatedPoints - manualPoints

            const status = Math.abs(delta) < 0.01 ? 'MATCH' : 'MISMATCH'
            if (status === 'MISMATCH') mismatchCount++

            console.log(
                `\n[${status}] ${team.name} (${side}) — manual: ${manualPoints}, automated: ${automatedPoints.toFixed(2)}, delta: ${delta.toFixed(2)}`
            )
            if (status === 'MISMATCH' && lines.length > 0) {
                console.log('  Automated breakdown by player:')
                for (const l of lines) {
                    console.log(`    ${l.name} (#${l.playerId}): ${l.points}`)
                }
            }
        }
    }

    console.log('\n' + '='.repeat(70))
    console.log(
        mismatchCount === 0
            ? 'All matchups match between automated and manual scoring.'
            : `${mismatchCount} matchup side(s) mismatched — see above for per-player breakdowns.`
    )

    await prisma.$disconnect()
}

main()
