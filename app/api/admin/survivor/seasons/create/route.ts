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

        const body = await req.json()

        const { number, title, theme, location, imageUrl, airDate, finaleDate, isActive } = body

        if (!number || !title) {
            return NextResponse.json({ error: 'Number and title are required' }, { status: 400 })
        }

        // IF setting as active, deactivate all others
        if (isActive) {
            await prisma.survivorSeason.updateMany({
                data: { isActive: false }
            })
        }

        const season = await prisma.survivorSeason.create({
            data: {
                number,
                title,
                theme: theme || null,
                location: location || null,
                imageUrl: imageUrl || null,
                airDate: airDate ? new Date(airDate): null,
                finaleDate: finaleDate ? new Date(finaleDate) : null,
                isActive,
            }
        })

        return NextResponse.json({ success: true, season})
        
    } catch (err) {
        console.error('[create-season] error:', err)
        return NextResponse.json({ error: 'Failed to create season' }, { status: 500 })
    }
}