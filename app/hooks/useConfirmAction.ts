'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ApiResult } from '@/lib/clientApi'

export type ConfirmRequest = {
    title: string
    message: string
    confirmLabel?: string
    action: () => Promise<ApiResult>
}

/**
 * State and flow for an "are you sure?" dialog in front of an API call.
 * On failure the dialog stays open and shows the error; on success it closes and the
 * server data is refreshed.
 */
export function useConfirmAction() {
    const router = useRouter()
    const [request, setRequest] = useState<ConfirmRequest | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const ask = useCallback((next: ConfirmRequest) => {
        setError(null)
        setRequest(next)
    }, [])

    const cancel = useCallback(() => setRequest(null), [])

    const confirm = useCallback(async () => {
        if (!request) return
        setLoading(true)
        setError(null)
        try {
            const result = await request.action()
            if (!result.ok) {
                setError(result.error)
                return
            }
            setRequest(null)
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [request, router])

    return {
        ask,
        dialogProps: { request, loading, error, onConfirm: confirm, onCancel: cancel },
    }
}