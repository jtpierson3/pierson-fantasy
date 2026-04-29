import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    console.log('Webhook secret exists:', !!WEBHOOK_SECRET)
    console.log('All env keys:', Object.keys(process.env).filter(k=>k.includes('CLERK')))

    if (!WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'No webhook secret' }, { status: 500 })
    }

    // Get Headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    if (!svix_id || !svix_signature || !svix_timestamp) {
        return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
    }

    const payload = await req.json()
    const body = JSON.stringify(payload)
    const wh = new Webhook(WEBHOOK_SECRET)

    let evt: WebhookEvent

    try {
        evt = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature
        }) as WebhookEvent
    } catch (err) {
        return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
    }

    //Handle the event
    // Create still works as clerk will fire the event regardless if the user is created via
    // the app or on Clerk's website.
    if (evt.type === 'user.created') {
        const { id, email_addresses, username } = evt.data

        await prisma.user.create({
            data: {
                clerkId: id,
                email: email_addresses[0].email_address,
                username: username ?? email_addresses[0].email_address.split('@')[0],
            },
        })
    }

    if (evt.type === 'user.deleted') {
        const { id } = evt.data
        if (id) {
            await prisma.user.delete({
                where: { clerkId: id },
            })
        }
    }

    return NextResponse.json({ success: true })
}