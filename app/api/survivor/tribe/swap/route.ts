import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({ where: { clerkId } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { tribeId, swapOutId, swapInId } = await req.json()

        // Verify tribe belongs to user
        const tribe = await prisma.survivorFantasyLeagueTribe.findFirst({
            where: { id: tribeId, userId: user.id },
            include: {
                survivorLeague: {
                    include: {
                        survivorSeason: {
                            include: {
                                episodes: {
                                    orderBy: { number: 'asc' }
                                }
                            }
                        }
                    }
                },
                players: true
            }
        })

        if (!tribe) return NextResponse.json({ error: 'Tribe not found' }, { status: 404 })

        // Check swap hasn't been used
        if (tribe.hasUsedMergeSwap) {
            return NextResponse.json({ error: 'Merge swap already used' }, { status: 400 })
        }

        // Check Merge has Happened
        const mergeEpisode = tribe.survivorLeague.survivorSeason.episodes
            .find(e => e.isMerge && e.isAired)

        if (!mergeEpisode) {
            return NextResponse.json({ error: 'Merge has not happened yet' }, { status: 400 })
        }

        // Check next episode hasn't aired yet.
        const episodesAfterMerge = tribe.survivorLeague.survivorSeason.episodes
            .filter(e => e.number > mergeEpisode.number)
            .sort((a, b) => a.number - b.number)

        const nextEpisode = episodesAfterMerge[0]
        if (nextEpisode?.isAired) {
            return NextResponse.json({ error: 'Swap window has closed' }, { status: 400 })
        }

        // Verify swap out is in tribe
        const swapOutPick = tribe.players.find(p => p.contestantId === swapOutId)
        if (!swapOutPick) {
            return NextResponse.json({ error: 'Contestant not in tribe' }, { status: 404 })
        }

        // Verify swap in is active
        const swapInContestant = await prisma.contestant.findFirst({
            where: {
                id: swapInId,
                survivorSeasonId: tribe.survivorLeague.survivorSeason.id,
                status: { in: ['active', 'finalist']}
            }
        })

        if (!swapInContestant) {
            return NextResponse.json({ error: 'Contestant not available' }, { status: 400 })
        }

        // Perform the swap in a transaction
        await prisma.$transaction([
            //Remove old pick
            prisma.survivorPicks.delete({
                where: { id: swapOutPick.id }
            }),
            //Add new pick with swap flag
            prisma.survivorPicks.create({
                data: {
                    tribeId,
                    contestantId: swapInId,
                    isSwap: true,
                    swappedFromId: swapOutId,
                }
            }),
            // Mark swap as used
            prisma.survivorFantasyLeagueTribe.update({
                where: { id: tribeId },
                data: { hasUsedMergeSwap: true }
            })
        ])

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[tribe-swap] error:', err)
        return NextResponse.json({ error: 'Failed to save swap' }, { status: 500 })
    }
}