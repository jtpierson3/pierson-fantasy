async function main() {
    const dotenv = await import('dotenv')
    dotenv.config({ path: '.env.local' })

    const { prisma } = await import('@/lib/prisma')

    const confirmed = await prisma.playerTransfer.findMany({
        where: { status: 'confirmed' },
        include: { player: true }
    })

    const stale = confirmed.filter(t => t.player.teamId === t.formerTeamId)

    console.log(`Found ${confirmed.length} confirmed transfers, ${stale.length} appear stale:`)
    for (const t of stale) {
        console.log(`- ${t.player.display_name} (id: ${t.playerId}) - still shows teamId ${t.player.teamId}, transfer confirmed ${t.reviewedAt}`)
    }

    await prisma.$disconnect()
}

main()