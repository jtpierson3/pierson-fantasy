import 'dotenv/config'
import { PrismaClient, RosterSlot } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Celtic's team Id
const CELTIC_TEAM_ID = 53

async function main() {
    console.log('Starting seed ...')

    //Step 1: Find your user in the database
    const user = await prisma.user.findFirst({
        orderBy: { createdAt: 'asc'}
    })

    if (!user) {
        throw new Error('no users found - make sure you have signed in at least once')
    }

    console.log(`Found user: ${user.email}`)

    // Step 2: create a test fantasy league
    const fantasyLeague = await prisma.fantasyLeague.upsert({
        where: { id: 'test-league-1' },
        update: {},
        create: {
            id: 'test-league-1',
            name: 'Test League 2025/26',
            description: 'Test league for development'
        },
    })

    console.log(`Fantasy league: ${fantasyLeague.name}`)

    // Step 3: Add user to the league
    await prisma.fantasyLeagueMember.upsert({
        where: {
            userId_fantasyLeagueId: {
                userId: user.id,
                fantasyLeagueId: fantasyLeague.id,
            }
        },
        update: {},
        create: {
            userId: user.id,
            fantasyLeagueId: fantasyLeague.id,
            isAdmin: true,
            points: 0
        },
    })

    console.log('User Added to league')

    // Step 4: Create Fantasy Team
    const fantasyTeam = await prisma.fantasyTeam.upsert({
        where: {
            userId_fantasyLeagueId: {
                userId: user.id,
                fantasyLeagueId: fantasyLeague.id,
            }
        },
        update: {},
        create: {
            name: `{user.username}'s Team`,
            formation: '4-3-3',
            userId: user.id,
            fantasyLeagueId: fantasyLeague.id
        }
    })

    console.log(`Fantasy team: ${fantasyTeam.name}`)

    //Step 5: Fetch Celtic's players from DB
    const celticPlayers = await prisma.player.findMany({
        where: { teamId: CELTIC_TEAM_ID },
        orderBy: { position_id: 'asc'}
    })

    console.log(`Found ${celticPlayers.length} Celtic players`)

    if (celticPlayers.length <23) {
        throw new Error(`Not enough Celtic players - found ${celticPlayers.length}, need 23`)
    }

    // Step 6: Clear existing roster
    await prisma.fantasyTeamPlayer.deleteMany({
        where: { fantasyTeamId: fantasyTeam.id }
    })

    // Step 7: Assign players to roster slots
    // Sort by position first, then DEF, MID, ATT
    const goalkeepers = celticPlayers.filter(p => p.position_id === 24)
    const defenders = celticPlayers.filter(p => p.position_id === 25)
    const midfielders = celticPlayers.filter(p => p.position_id === 26)
    const attackers = celticPlayers.filter(p => p.position_id === 27)

    console.log(`GK: ${goalkeepers.length}, DEF: ${defenders.length}, MID: ${midfielders.length}, ATT: ${attackers.length}`)

    //Build 11 starters out of team
    const starters = [
        goalkeepers[0],
        ...defenders.slice(0,4),
        ...midfielders.slice(0,3),
        ...attackers.slice(0,3)
    ].filter(Boolean)

    //Build 5 subs from remaining players
    const usedIds = new Set(starters.map(p => p.id))
    const remaining = celticPlayers.filter(p => !usedIds.has(p.id))
    const subs = remaining.slice(0,5)

    //build 7 resrevers from wha's left
    const subIds = new Set(subs.map(p=>p.id))
    const reserves = remaining.filter(p=> !subIds.has(p.id)).slice(0,7)

    // Step 8 insert all players
    const assignments = [
        ...starters.map((player, index) => ({
            fantasyTeamId: fantasyTeam.id,
            playerId: player.id,
            rosterSlot: RosterSlot.STARTER,
            slotOrder: index+1,
        })),
        ...subs.map((player, index) => ({
           fantasyTeamId: fantasyTeam.id,
            playerId: player.id,
            rosterSlot: RosterSlot.SUB,
            slotOrder: index+1, 
        })),
        ...reserves.map((player,index) => ({
            fantasyTeamId: fantasyTeam.id,
            playerId: player.id,
            rosterSlot: RosterSlot.RESERVE,
            slotOrder: index+1,
        }))
    ]

    await prisma.fantasyTeamPlayer.createMany({
        data: assignments,
    })

    console.log(`Assigned ${starters.length}, ${subs.length} subs, and ${reserves.length} reserves`)
    console.log('Seed complete')
}

main()
    .catch(err => {
        console.error('Seed error:', err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })