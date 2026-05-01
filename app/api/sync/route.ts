import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

const BASE_URL = 'https://api.sportmonks.com/v3/football'
const LEAGUE_ID = 501
const SEASON_ID = 25598

async function sportmonksFetch(endpoint: string) {
    const separator = endpoint.includes('?') ? '&' : '?'
    const res = await fetch(`${BASE_URL}${endpoint}${separator}api_token=${env.SPORTMONKS_API_KEY}`)
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Sportmonks error: ${res.status} - ${text}`)
    }
    return res.json()
}

export async function POST(req: Request) {
    //PROTECT THE SYNC ROUTE WITH A SECRET KEY
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${env.SYNC_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        console.log('Starting sync...') 

        // Step 1: Fetch league data
        const leagueData = await sportmonksFetch(`/leagues/${LEAGUE_ID}?include=currentSeason`)
        const league = leagueData.data

        //Upsert league
        await prisma.league.upsert({
            where: { id: LEAGUE_ID },
            update: {
                name: league.name,
                short_code: league.short_code ?? null,
                image_path: league.image_path,
                season_id: SEASON_ID
            },
            create: {
                id: LEAGUE_ID,
                name: league.name,
                short_code: league.short_code ?? null,
                image_path: league.image_path,
                season_id: SEASON_ID
            }
        })
        console.log('League synced')

        // Step 2: Fetch all teams in the season
        const teamsData = await sportmonksFetch(`/teams/seasons/${SEASON_ID}`)
        const teams = teamsData.data ?? []

        // Upsert all teams
        for (const team of teams) {
            await prisma.team.upsert({
                where: { id: team.id },
                update: {
                    name: team.name,
                    short_code: team.short_code ?? null,
                    image_path: team.image_path,
                    leagueId: LEAGUE_ID,
                },
                create: {
                    id: team.id,
                    name: team.name,
                    short_code: team.short_code ?? null,
                    image_path: team.image_path,
                    leagueId: LEAGUE_ID
                },
            })
        }
        console.log(`${teams.length} teams synced.`)

        // Step 3: Fetch squad for each team and upsert players
        let totalPlayers = 0
        for (const team of teams) {
            const squadData = await sportmonksFetch(
                `/squads/seasons/${SEASON_ID}/teams/${team.id}?include=player`
            )
            const squad = squadData.data ?? []

            for (const member of squad) {
                const player = member.player
                if (!player) continue

                await prisma.player.upsert({
                    where: { id: player.id },
                    update: {
                        display_name: player.display_name,
                        image_path: player.image_path,
                        position_id: member.position_id ?? player.position_id ?? 0,
                        jersey_number: member.jersey_number?? null,
                        date_of_birth: player.date_of_birth ?? null,
                        teamId: team.teamId
                    },
                    create: {
                        id: player.id,
                        display_name: player.display_name,
                        image_path: player.image_path,
                        position_id: member.position_id ?? 0,
                        jersey_number: member.jersey_number ?? null,
                        date_of_birth: player.date_of_birth ?? null,
                        teamId: team.id,
                    },
                })
                totalPlayers++
            }
            console.log(`Squad synced for ${team.name}`)
        }

        console.log(`Sync complete. ${totalPlayers} players synced`)
        return NextResponse.json({
            success: true,
            teams: teams.length,
            players: totalPlayers
        })
    } catch (err) {
        console.error('Sync Error: ', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Sync failed' },
            { status: 500}
        )
    }
}