import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { tribalCouncilId, votes, eliminatedId } = await req.json()

    // Clear existing votes
    await prisma.votingRecord.deleteMany({ where: { tribalCouncilId } })

    // Create votes with revocation status
    if (votes.length > 0) {
      await prisma.votingRecord.createMany({
        data: votes.map(({ voterId, votedForId, isRevoked }: {
          voterId: string
          votedForId: string
          isRevoked: boolean
        }) => ({
          tribalCouncilId,
          voterId,
          votedForId,
          isRevoked,
        }))
      })
    }

    // Update eliminated and contestant status
    await prisma.tribalCouncil.update({
      where: { id: tribalCouncilId },
      data: { eliminatedId: eliminatedId || null }
    })

    if (eliminatedId) {
      await prisma.contestant.update({
        where: { id: eliminatedId },
        data: {
          status: 'eliminated',
        }
      })

      // Mark all tribe memberships as inactive
      await prisma.tribeMembership.updateMany({
        where: { contestantId: eliminatedId, isCurrent: true },
        data: { isCurrent: false }
      })

      const tribalCouncil = await prisma.tribalCouncil.findUnique({
        where: { id: tribalCouncilId },
        select: { 
          episodeId: true, 
          episode: { 
            select: {
              isFinale: true,
              survivorSeasonId: true
            }
          }
        }
      })

      if (tribalCouncil) {
        if (tribalCouncil.episode.isFinale) {
          // For finale - correct pick is the winner
            const winner = await prisma.contestant.findFirst({
              where: {
                survivorSeasonId: tribalCouncil.episode.survivorSeasonId,
                status: 'winner'
              }
            })

            if (winner) {
              await prisma.eliminationPick.updateMany({
                where: {
                  episodeId: tribalCouncil.episodeId,
                  contestantId: winner.id,
                },
                data: { isCorrect: true }
              })

              await prisma.eliminationPick.updateMany({
                where: {
                  episodeId: tribalCouncil.episodeId,
                  contestantId: { not: winner.id },
                },
                data: { isCorrect: false }
              })
            }

        } else {
          // REgular episode - correct pick is eliminated contestant
          await prisma.eliminationPick.updateMany({
            where: {
              episodeId: tribalCouncil.episodeId,
              contestantId: eliminatedId,
            },
            data: {
              isCorrect: true
            }
          })

          //Mark incorrect Picks
          await prisma.eliminationPick.updateMany({
            where: {
              episodeId: tribalCouncil.episodeId,
              contestantId: { not: eliminatedId },
            },
            data: { isCorrect: false}
          })
        }  
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[save-votes] error:', err)
    return NextResponse.json({ error: 'Failed to save votes' }, { status: 500 })
  }
}