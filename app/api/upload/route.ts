import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try{
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const currentUser = await prisma.user.findUnique({
            where: { clerkId }
        })
        if (!currentUser?.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized ' }, { status: 401 })
        }

        const form = await req.formData()
        const file = form.get('file') as File
        const folder = (form.get('folder') as string) ?? 'general'

        if (!file) {
            return NextResponse.json({ error: 'No file provided ' }, { status: 400 })
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image ' }, { status: 400 })
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File must be under 5mb ' }, { status: 400 })
        }

        const blob = await put(`${folder}/${Date.now()}-${file.name}`, file, {
            access: 'public'
        })

    } catch (err) {
        console.error('[upload] error: ', err)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}