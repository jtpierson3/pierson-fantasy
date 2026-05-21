import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const currentUser = await prisma.user.findUnique({ where: { clerkId } })
        if (!currentUser?.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { seasonId, number, title, theme, location, imageUrl, airDate, finaleDate, isActive,
            summary, production, twists
         } = await req.json()

        if (!number || !title) {
            return NextResponse.json({ error: 'Number and title are required' }, { status: 400 })
        }

        if (isActive) {
            await prisma.survivorSeason.updateMany({
                where: { id: { not: seasonId } },
                data: { isActive: false }
            })
        }

        const season = await prisma.survivorSeason.update({
            where: { id: seasonId },
            data: {
                number,
                title,
                theme: theme || null,
                location: location || null,
                imageUrl: imageUrl || null,
                airDate: airDate ? new Date(airDate): null,
                finaleDate: finaleDate ? new Date(finaleDate) : null,
                isActive,
                summary: summary || null,
                production: production || null,
                twists: twists || null
            }
        })

        return NextResponse.json({ success: true })
        
    } catch (err) {
        console.error('[update-season] error:', err)
        return NextResponse.json({ error: 'Failed to update season' }, { status: 500 })
    }
}