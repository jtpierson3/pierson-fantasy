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
 * True when the user is a site admin, or an admin of this specific league.
 * (Not "admin of any league" - that is requireLeagueAdmin.)
 */
export async function canAdminLeague(user: User, leagueId: unknown): Promise<boolean> {
    if (user.isSiteAdmin) return true

    // leagueId comes from a request body. Prisma drops a filter whose value is undefined, which
    // would match ANY league this user admins, so reject anything that isn't a real id first.
    if (typeof leagueId !== 'string' || leagueId === '') return false

    const membership = await prisma.fantasyLeagueMember.findFirst({
        where: { userId: user.id, fantasyLeagueId: leagueId, isAdmin: true },
        select: { id: true },
    })
    return membership !== null
}

/**
 * Like requireUser, but also requires a site admin or an admin of the given league.
 * Use for admin routes that act on one specific league, with the leagueId from the request.
 */
export async function requireLeagueAdminOf(leagueId: unknown): Promise<AuthResult> {
    const result = await requireUser()
    if (!result.ok) return result

    if (!(await canAdminLeague(result.user, leagueId))) {
        return { ok: false, status: 401, error: 'Unauthorized' }
    }

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