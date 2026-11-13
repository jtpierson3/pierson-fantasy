import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if(!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        const { memberId, isAdmin } = await req.json()

        const member = await prisma.fantasyLeagueMember.findUnique({
            where: { id: memberId }
        })
        if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404})

        await prisma.fantasyLeagueMember.update({
            where: { id: memberId },
            data: { isAdmin }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[toggle-admin] error: ', err)
        return NextResponse.json({ error: 'Failed to create update admin status' }, { status: 500})
    }
}