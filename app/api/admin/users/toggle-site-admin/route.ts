import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try{
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        const { userId, isSiteAdmin } = await req.json()

        await prisma.user.update({
            where: {id: userId },
            data: { isSiteAdmin }
        })

        return NextResponse.json({ success: true})

    } catch (err) {
        console.error('[toggle-site-admin] error:', err)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
}