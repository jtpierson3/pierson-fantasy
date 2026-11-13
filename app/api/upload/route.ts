import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireSiteAdmin } from '@/lib/apiAuth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    try{
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

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

        return NextResponse.json(({ url: blob.url }))

    } catch (err) {
        console.error('[upload] error: ', err)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}