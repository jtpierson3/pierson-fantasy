import { NextResponse } from "next/server"
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        
        const currentUser = await prisma.user.findUnique({
            where: { clerkId }
        })
        if (!currentUser?.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

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

        return NextResponse.json({ success: true, league })
    } catch (err) {
        console.error('[create-league] error: ', err)
        return NextResponse.json({ error: 'Failed to create league' }, { status: 500})
    }
}