// Browser-side helper for calling out own JSON API routes.

export type ApiResult<T = unknown> =
    | { ok: true; data: T }
    | { ok: false; error: string }

const FALLBACK_ERROR = 'Something went wrong. Please try again.'
const NETWORK_ERROR = 'Network error. Check your connection and try again'

// These routes answer failures with { error: string }. Antyhing else (an HTML error page, an
// empty body, a non-string error) falls back to the generic message.
function extractError(data: unknown): string | null {
    if (typeof data !== 'object' || data === null || !('error' in data)) return null
    const error = (data as { error: unknown }).error
    return typeof error === 'string' && error.trim() !== '' ? error : null
}

/**
 * POSTs JSON and returns a result instead of throwing, so callers can show the error.
 * `fetchImpl` is only injectable for tests.
 */
export async function postJson<T = unknown>(
    url: string,
    body: unknown,
    fetchImpl: typeof fetch = fetch
): Promise<ApiResult<T>> {
    let res: Response
    try {
        res = await fetchImpl(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
    } catch {
        return { ok: false, error: NETWORK_ERROR }
    }

    let data: unknown = null
    try {
        data = await res.json()
    } catch {
        // empty or non-JSON body - fine on success, falls back to generic message on failure
    }

    if (!res.ok) return { ok: false, error: extractError(data) ?? FALLBACK_ERROR }
    return { ok: true, data: data as T }
}
