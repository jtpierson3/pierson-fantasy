import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import SurvivorDashboard from './survivorDashboard'

function SurvivorSkeleton() {
    return (
        <div className="p-6">
            <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-6" />
            <div className="grid grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                ))}
            </div>
        </div>
    )
}

async function SurvivorContent() {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const user = await prisma.user.findUnique({
        where: { clerkId: userId}
    })
    if (!user) redirect('/sign-in')

    const leagues = await prisma.survivorLeague.findMany({
        where: {
            members: { some: { userId: user.id } }
        },
        include: {
            survivorSeason: true,
            members: {
                include: { user: true }
            },
            tribes: {
                include: {
                    players: {
                        include: {
                            contestant: {
                                include: { survivorPlayer: true}
                            }
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })
    return <SurvivorDashboard leagues={leagues as any} userId={user.id} />
}

export default function SurvivorPage() {
    return (
        <Suspense fallback={<SurvivorSkeleton />}>
            <SurvivorContent />
        </Suspense>
    )
}