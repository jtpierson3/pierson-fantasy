import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import type { User } from '@prisma/client'

export type AuthResult =
    | { ok: true; user: User }
    | { ok: false; status: number; error: string }

/**
 * Resolves the currently authenticated clerk session to a real user row.
 * Use at the top of any route that just needs a logged in user
 */
export async function requireUser(): Promise<AuthResult> {
    const { userId: clerkId } = await auth()
    if (!clerkId) return { ok: false, status: 401, error: 'Unauthorized' }

    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) return { ok: false, status: 401, error: 'Unauthorized' }

    return { ok: true, user }
}

/**
 * Requires the user to be a site admin OR an admin of at least one league.
 * Use for admin tools that aren't scoped to a specfic league
 */
export async function requireLeagueAdmin(): Promise<AuthResult> {
    const result = await requireUser()
    if (!result.ok) return result

    if (result.user.isSiteAdmin) return result

    const membership = await prisma.fantasyLeagueMember.findFirst({
        where: { userId: result.user.id, isAdmin: true },
        select: { id: true },
    })
    if (!membership) return { ok: false, status: 401, error: 'Unauthorized' }

    return result
}

/**
 * Same as requireUser, but also requires the user to be a site admin.
 * Use at the top of any/api/admin route.
 */
export async function requireSiteAdmin(): Promise<AuthResult> {
    const result = await requireUser()
    if (!result.ok) return result
    
    if (!result.user.isSiteAdmin) {
        return { ok: false, status: 401, error: 'Unauthorized' }
    }

    return result
}