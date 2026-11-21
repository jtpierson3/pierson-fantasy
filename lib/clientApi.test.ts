import { describe, it, expect, vi } from 'vitest'
import { postJson } from './clientApi'

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

describe('postJson', () => {
    it('POSTs the body as JSON', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }))

        await postJson('/api/x', { a: 1 }, fetchMock)

        expect(fetchMock).toHaveBeenCalledWith('/api/x', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ a: 1 }),
        })
    })

    it('returns the parsed data on success', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'abc' }))

        const result = await postJson<{ id: string }>('/api/x', {}, fetchMock)

        expect(result).toEqual({ ok: true, data: { id: 'abc' } })
    })

    it('succeeds on an empty body', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))

        const result = await postJson('/api/x', {}, fetchMock)

        expect(result).toEqual({ ok: true, data: null })
    })

    it('returns the server error message on a failed response', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'Lineup is locked' }, 403))

        const result = await postJson('/api/x', {}, fetchMock)

        expect(result).toEqual({ ok: false, error: 'Lineup is locked' })
    })

    it('falls back to a generic message when the failure body is not written JSON', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }))

        const result = await postJson('/api/x', {}, fetchMock)

        expect(result).toEqual({ ok: false, error: 'Something went wrong. Please try again.' })
    })

    it('falls back when the error field is not a usable string', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({ error: { nested: true } }, 400))
            .mockResolvedValueOnce(jsonResponse({ error: '   ' }, 400))

        const first = await postJson('/api/x', {}, fetchMock)
        const second = await postJson('/api/x', {}, fetchMock)

        expect(first.ok).toBe(false)
        expect(second.ok).toBe(false)
        if (!first.ok) expect(first.error).toBe('Something went wrong. Please try again.')
        if (!second.ok) expect(second.error).toBe('Something went wrong. Please try again.')
    })
})