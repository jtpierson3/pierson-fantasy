'use client'

type Props = {
    request: { title: string; message: string; confirmLabel?: string } | null
    loading: boolean
    error: string | null
    onConfirm: () => void
    onCancel: () => void
}

/** Dark-theme confirmation modal. Renders nothing when there is no request. Pair with useConfirmAction */
export default function ConfirmDialog({ request, loading, error, onConfirm, onCancel }: Props) {
    if (!request) return null

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div
                role="dialog"
                aria-modal="true"
                className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl"
            >
                <h3 className="text-base font-medium text-white mb-2">{request.title}</h3>
                <p className={`text-sm text-gray-400 ${error ? 'mb-3' : 'mb-6'}`}>{request.message}</p>
                {error && <p className="text-sm text-red-400 mb-6">{error}</p>}
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-4 py-2 text-sm rounded-lg bg-red-700 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Working...' : (request.confirmLabel ?? 'Delete')}
                    </button>
                </div>
            </div>
        </div>
    )
}