import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import AdminNav from './adminNav'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { userId } = await auth()
    if (!userId) notFound()

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
            leagues: {
                include: { fantasyLeague: true }
            }
        }
    })

    if (!user) notFound()

    // Must be either a site admin or a league admi
    const isLeagueAdmin = user.leagues.some(m => m.isAdmin)
    if (!user.isSiteAdmin && !isLeagueAdmin) notFound()

    return (
        <div className="min-h-screen bg-gray-950">
            <AdminNav 
                isSiteAdmin={user.isSiteAdmin}
                username={user.username}
            />
            <main className="max-w-6x1 mx-auto px-6 py-8">
                {children}
            </main>
        </div>
    )
}