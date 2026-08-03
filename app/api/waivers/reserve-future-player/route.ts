import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({ where: { clerkId } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { displayName, currentClubName } = await req.json()

        const name = displayName?.trim()
        const club = currentClubName?.trim()

        if (!name || name.length < 2) {
            return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
        }
        if (!club || club.length < 2) {
            return NextResponse.json({ error: 'Current Club is required' }, { status: 400 })
        }

        // Synthetic negative ID = real sportmonks IDs are always positive,
        // so this guarantees zero collision riks with any real player
        // now or once they eventually sync for real.
        // Use a timestamp-based negative number for uniqueness
        const syntheticId = -Date.now()
        
        const player = await prisma.player.create({
            data: {
                id: syntheticId,
                display_name: name,
                image_path: '',
                position_id: 0,
                currentClubName: club
            }
        })

        return NextResponse.json({ player: {
            id: player.id,
            display_name: player.display_name,
            image_path: player.image_path,
            currentClubName: player.currentClubName,
            team: null
        }})
    } catch (err) {
        console.error('[reserve-futuer-player] error: ', err)
        return NextResponse.json({ error: 'Failed to reserve player' }, { status: 500 })
    }
}