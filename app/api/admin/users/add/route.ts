import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { createClerkClient } from '@clerk/backend'
import { requireLeagueAdmin } from '@/lib/apiAuth'

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY })

export async function POST(req: Request) {
    try {
        const authResult = await requireLeagueAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error, status: authResult.status })

        const { email, username } = await req.json()

        if (!email || !username) {
            return NextResponse.json({ error: 'Email and username are required' }, { status: 400 })
        }

        // check if user already exists in db
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            }
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'A user with that email or username already exists' },
                { status: 400 }
            )
        }

        // Add to Clerk allowlist
        await clerk.allowlistIdentifiers.createAllowlistIdentifier({
            identifier: email,
            notify: true,
        })

        // Create user in database
        const newUser = await prisma.user.create({
            data: {
                clerkId: `pending_${email}`, //placeholder until they sign in
                username,
                email,
                isSiteAdmin: false
            }
        })

        return NextResponse.json({ success: true, user: newUser })
    } catch (err) {
        console.error('[add-user] error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to add user' },
            { status: 500 }
        )
    }
}