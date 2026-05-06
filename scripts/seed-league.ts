import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { isReactCompilerRequired } from 'next/dist/build/swc/generated-native'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('Seeding league data ... ')

    //Get test league
    const league = await prisma.fantasyLeague.findFirst({
        where: { id: 'test-league-1' },
        include: {teams: true}
    })

    if (!league) throw new Error('Test league not found - run seed:team first')
    if (league.teams.length ===0) throw new Error('No teams found in league')

    console.log(`Found league: ${league.name} with ${league.teams.length} team(s)`)

    // We only have one team so far so we will have to create a dummy opponent
    const userTeam = league.teams[0]

    //Create a test opponent user
    const opponentUser = await prisma.user.upsert({
        where: { clerkId: 'test-opponent-clerk-id', },
        update: {},
        create: {
            clerkId: 'test-opponent-clerk-id',
            username: 'TestOpponent',
            email: 'opponent@test.com'
        }
    })

    let opponentTeam = await prisma.fantasyTeam.findFirst({
        where: { userId: opponentUser.id, fantasyLeagueId: league.id}
    })

    if (!opponentTeam) {
        opponentTeam = await prisma.fantasyTeam.create({
            data: {
                id: 'test-opponent-1',
                name: 'Test Opponent FC',
                formation: '4-4-2',
                wins: 3,
                losses: 2,
                draws: 0,
                totalLeaguePoints: 11,
                totalFantasyPoints: 245,
                userId: opponentUser.id,
                fantasyLeagueId: league.id
            }
        })
    }

    console.log(`Opponent team: ${opponentTeam.name}`)

    await prisma.fantasyTeam.update({
        where: { id: userTeam.id },
        data: {
            wins: 4,
            losses: 1,
            draws: 0,
            totalLeaguePoints: 13,
            totalFantasyPoints: 312,
            standingsChange: 1
        }
    })

    // Create gameweeks
    const now = new Date() 
    const gameweeks = [
        { number: 1, daysOffset: -28, isComplete: true, isCurrent: false },
        { number: 2, daysOffset: -14, isComplete: true, isCurrent: false },
        { number: 3, daysOffset: -7, isComplete: true, isCurrent: false },
        { number: 4, daysOffset: 0, isComplete: true, isCurrent: false },
        { number: 1, daysOffset: 7, isComplete: true, isCurrent: false },
        { number: 1, daysOffset: 14, isComplete: true, isCurrent: false },
    ]

    const createdGameweeks = []
    for (const gw of gameweeks) {
        const startDate = new Date(now) 
        startDate.setDate(startDate.getDate() + gw.daysOffset)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 3)

        const gameweek = await prisma.fantasyGameweek.upsert({
            where:{
                fantasyLeagueId_gameweekNumber: {
                    fantasyLeagueId: league.id,
                    gameweekNumber: gw.number
                }
            },
            update: {
                isComplete: gw.isComplete,
                isCurrent: gw.isCurrent
            },
            create: {
                fantasyLeagueId: league.id,
                gameweekNumber: gw.number,
                startDate,
                endDate,
                isComplete: gw.isComplete,
                isCurrent: gw.isCurrent
            }
        })
        createdGameweeks.push(gameweek)
    }

    console.log(`Created ${createdGameweeks.length} gameweeks`)

    const matchupData = [
        {gwIndex: 0, homePoints: 68, awayPoints: 54, isComplete: true},
        {gwIndex: 1, homePoints: 71, awayPoints: 80, isComplete: true},
        {gwIndex: 2, homePoints: 59, awayPoints: 54, isComplete: true},
        {gwIndex: 3, homePoints: 32, awayPoints: 28, isComplete: false},
        {gwIndex: 4, homePoints: 0, awayPoints: 0, isComplete: false},
        {gwIndex: 5, homePoints: 0, awayPoints: 0, isComplete: false},
    ]

    for (const m of matchupData) {
        await prisma.fantasyMatchup.upsert({
            where: {id: `test-matchup-${m.gwIndex + 1}` },
            update: {
                homePoints: m.homePoints,
                awayPoints: m.awayPoints,
                isComplete: m.isComplete,
            },
            create: {
                id: `test-matchup-${m.gwIndex + 1 }`,
                gameweekId: createdGameweeks[m.gwIndex].id,
                homeTeamId: userTeam.id,
                awayTeamId: opponentTeam.id,
                homePoints: m.homePoints,
                awayPoints: m.awayPoints,
                isComplete: m.isComplete
            }
        })
    }

    console.log('Matchups created')
    console.log('League seed complete!')
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