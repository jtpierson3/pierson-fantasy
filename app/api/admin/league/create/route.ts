import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'


export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        const currentUser = authResult.user

        const { name, description } = await req.json()
        if (!name) return NextResponse.json({ error: 'Name is required'}, { status: 400 })

        const league = await prisma.fantasyLeague.create({
            data: {
                name,
                description: description || null,
                members: {
                    create: {
                        userId: currentUser.id,
                        isAdmin: true,
                    }
                }
            }
        })
        
        await prisma.fantasyTeam.create({
            data: {
                name: `${currentUser.username}'s Team`,
                userId: currentUser.id,
                fantasyLeagueId: league.id
            }
        })

        return NextResponse.json({ success: true, league })
    } catch (err) {
        console.error('[create-league] error: ', err)
        return NextResponse.json({ error: 'Failed to create league' }, { status: 500})
    }
}