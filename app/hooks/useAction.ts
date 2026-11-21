'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ApiResult } from '@/lib/clientApi'

type RunOptions<T> = {
    onSuccess?: (data: T) => void
    refresh?: boolean
}

/**
 * Wraps one user action (e.g. a button that calls an API route): tracks pending, keeps the error
 * to show next to the button, and refreshes the server data after success.
 * 
 * run() resolves to true on success, false on failure
 * For per-row actions, keep your own "which row is busy state" - pending is one flag per hook.
 */
export function useAction() {
    const router = useRouter()
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const run = useCallback(
        async <T,>(action: () => Promise<ApiResult<T>>, options: RunOptions<T> = {}): Promise<boolean> => {
            setPending(true)
            setError(null)
            try {
                const result = await action()
                if (!result.ok) {
                    setError(result.error)
                    return false
                }
                options.onSuccess?.(result.data)
                if (options.refresh !== false) router.refresh()
                return true
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
                return false
            } finally {
                setPending(false)
            }
        },
        [router]
    )
    
    const clearError = useCallback(() => setError(null), [])

    return { run, pending, error, clearError }
}