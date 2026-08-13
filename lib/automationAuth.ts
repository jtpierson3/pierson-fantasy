import { env } from '@/lib/env'

export type AutomationAuthResult = 
    | { ok: true }
    | { ok: false; status: number; error: string }

/**
 * Validates the shared-secret bearer token used by scheduled/automated callers -
 * the Github Actions scheduler, manual admin sync buttons ,etc. This is NOT a
 * real user session; use requireUser/requireSiteAdmin from lib/apiAuth.ts for 
 * routes a logged-in person calls directly.
 */
export function requireAutomationSecret(req: Request): AutomationAuthResult {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${env.SYNC_SECRET}`) {
        return { ok: false, status: 401, error: 'Unauthorized '}
    }
    return { ok: true }
}