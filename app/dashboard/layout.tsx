import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Sidebar from "../components/sidebar";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
            fantasyTeams: true,
            survivorLeagues: true
        }
    })

    if (!user) redirect('/sign-in')
    
    const hasFootball = user.fantasyTeams.length > 0
    const hasSurvivor = user.survivorLeagues.length > 0

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar hasFootball={hasFootball} hasSurvivor={hasSurvivor} />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    )
}