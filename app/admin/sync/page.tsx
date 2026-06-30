import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import SyncPanel from './SyncPanel'

export default async function SyncPage() {
    const { userId } = await auth()
    if (!userId) notFound()

    const currentUser = await prisma.user.findUnique({
        where: { clerkId: userId }
    })
    if (!currentUser?.isSiteAdmin) notFound()

    return <SyncPanel />
}