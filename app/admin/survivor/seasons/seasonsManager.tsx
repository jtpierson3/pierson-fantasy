'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Noto_Sans_Tamil_Supplement } from 'next/font/google'
//import ImageUpload from '@/app/components/ImageUpload'

type Season = {
    id: string
    number: number
    title: string
    theme?: string | null
    location?: string | null
    imageUrl?: string | null
    airDate?: Date | null
    finaleDate?: Date | null
    isActive: boolean
    contestants: { id: string }[]
    episodes: { id: string }[]
    tribes: { id: string }[]
}

type SeasonForm = {
    number: string
    title: string
    theme: string
    location: string
    imageUrl: string
    airDate: string
    finaleDate: string
    isActive: boolean
}

const emptyForm: SeasonForm = {
    number: '',
    title: '',
    theme: '',
    location: '',
    imageUrl: '',
    airDate: '',
    finaleDate: '',
    isActive: false,
}

type Props = {
    seasons: Season[]
}

type ConfirmDialog = {
    title: string
    message: string
    confirmLabel: string
    onConfirm: () => void
} | null

export default function SeasonsManager({ seasons }: Props) {
    const router = useRouter()
    const [showCreate, setShowCreate] = useState(false)
    const [editingSeason, setEditingSeason] = useState<Season | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [formError, setFormError] = useState<string | null>(null)
    const [formLoading, setFormLoading] = useState(false)
    const [confirm, setConfirm] = useState<ConfirmDialog>(null)
    const [confirmLoading, setConfirmLoading] = useState(false)
    
    const openCreate = useCallback(() => {
        setForm(emptyForm)
        setFormError(null)
        setShowCreate(true)
    }, [])

    const openEdit = useCallback((season: Season) => {
        setForm({
            number: season.number.toString(),
            title: season.title,
            theme: season.theme ?? '',
            location: season.location ?? '',
            imageUrl: season.imageUrl ?? '',
            airDate: season.airDate
                ? new Date(season.airDate).toISOString().split('T')[0]
                : '',
            finaleDate: season.finaleDate
                ? new Date(season.finaleDate).toISOString().split('T')[0]
                : '',
                isActive: season.isActive
        })
        setFormError(null)
        setEditingSeason(season)
    }, [])

    const handleSubmit = useCallback(async () => {
        if (!form.number || !form.title) {
            setFormError('Season number and title are required')
            return
        }

        setFormLoading(true)
        setFormError(null)

        try{
            const body = {
                number: parseInt(form.number),
                title: form.title,
                subtitle: form.theme || null,
                location: form.location || null,
                imageUrl: form.imageUrl || null,
                airDate: form.airDate || null,
                finaleDate: form.finaleDate || null,
                isActive: form.isActive,
                ...(editingSeason && { seasonId: editingSeason.id }),
            }

            const res = await fetch(
                editingSeason
                    ? '/api/admin/survivor/seasons/update'
                    : '/api/admin/survivor/seasons/create',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                }
            )

            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to save season')

            setShowCreate(false)
            setEditingSeason(null)
            router.refresh()
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to save season')
        } finally {
            setFormLoading(false)
        }
    }, [form, editingSeason, router])

    const handleDelete = useCallback((season: Season) => {
        setConfirm({
            title: 'Delete season',
            message: `Are you sure you want to delete ${season.title}? This will delete all contestants, episodes and scoring events, this can't be undone.`,
            confirmLabel: 'Delete permanently',
            onConfirm: async () => {
                setConfirmLoading(true)
                try {
                    const res = await fetch('/api/admin/survivor/seasons/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ seasonId: season.id})
                    })
                    if (!res.ok) throw new Error('Failed to delete season')
                    router.refresh()
                } catch {
                    // handle error
                } finally {
                    setConfirmLoading(false)
                    setConfirm(null)
                }
            }
        })
    }, [router])

    const isOpen = showCreate || !!editingSeason

    return(
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-medium text-white">Survivor Seasons</h1>
                    <p className="text-sm text-gray-400 mt-1">{seasons.length} seasons</p>
                </div>
                <button
                    onClick={openCreate}
                    className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
                >
                    + Add Season
                </button>
            </div>

            {/* Seasons Grid */}
            {seasons.length === 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                    <p className="text-sm text-gray-400">No Seasons yet. Add your first season!</p>
                </div>
            )}

            <div className="grid grid-cols-3 gap-4">
                {seasons.map(season => (
                    <div
                        key={season.id}
                        className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors"
                    >
                        {/* Season Image */}
                        {season.imageUrl ? (
                            <div className="relative h-32">
                                <Image 
                                    src={season.imageUrl}
                                    alt={season.title}
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent">
                                {season.isActive && (
                                    <div className="absolute top-2 right-2">
                                        <span className="text-xs. px-2 py-0.5 rounded-full bg-green-900 text-green-400 border border-green-700 font-medium">
                                            Active
                                        </span>
                                    </div>
                                )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-32 bg-gray-800 flex items-center justify-center">
                                <p className="text-2xl font-bold text-gray-600">S{season.number}</p>
                                {season.isActive && (
                                    <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-400 border border-green-700 font-medium">
                                        Active
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Season Info */}
                        <div className="p-4">
                            <p className="text-xs text-gray-500 mb-1">Season {season.number}</p>
                            <p className="text-sm font-medium text-white truncate">{season.title}</p>
                            {season.theme && (
                                <p className="text-xs text-gray-400 truncate mt-0.5">{season.theme}</p>
                            )}
                            {season.location && (
                                <p className="text-xs text-gray-500 mt-1">{season.location}</p>
                            )}

                            {/* Stats */}
                            <div className="flex gap-3 mt-3">
                                <span className="text-xs text-gray-500">
                                    {season.contestants.length} contestants
                                </span>
                                <span className="text-xs text-gray-500">
                                    {season.episodes.length} episodes
                                </span>
                                <span className="text-xs text-gray-500">
                                    {season.tribes.length} tribes
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-3">
                                <Link
                                    href={`/admin/survivor/seasons/${season.id}`}
                                    className="flex-1 text-center px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                                >
                                    Manage
                                </Link>
                                <button
                                    onClick={() => openEdit(season)}
                                    className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(season)}
                                    className="px-3 py-1.5 text-xs rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create/Edit Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-base font-medium text-white mb-1">
                            {editingSeason ? 'Edit Season' : 'Add Season'}
                        </h3>
                        <p className="text-sm text-gray-400 mb-6">
                            {editingSeason ? 'Update season details.' : 'Add a new Survivor Season.' }
                        </p>

                        <div className="flex flex-col gap-4">
                            {/* Image Upload */}
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                    Season Image
                                </label>
                                {/*}
                                <ImageUpload 
                                    value={form.imageUrl}
                                    onChange={url => setForm(prev => ({ ...prev, imageUrl: url }))}
                                    folder="survivor/seasons"
                                    placeholder="Upload Season Image"
                                />
                                */}
                            </div>

                            {/* Number + title row */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                        Season #
                                    </label>
                                    <input 
                                        type="number"
                                        value={form.number}
                                        onChange={e => setForm(prev => ({ ...prev, number: e.target.value }))}
                                        placeholder='XX'
                                        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                        Title
                                    </label>
                                    <input 
                                        type="text"
                                        value={form.title}
                                        onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Survivor XX"
                                        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none foucs:ring-1 focus:ring-green-600"
                                    />
                                </div>
                            </div>

                            {/* Subtitle */}
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                    Subtitle <span className="text-gray-600">(Optional)</span>
                                </label>
                                <input 
                                    type="text"
                                    value={form.theme}
                                    onChange={e => setForm(prev => ({ ...prev, subtitle: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none foucs:ring-1 focus:ring-green-600"
                                />
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                        Air date <span className="text-gray-600">(Optional)</span>
                                    </label>
                                    <input 
                                        type="date"
                                        value={form.airDate}
                                        onChange={e => setForm(prev => ({ ...prev, airDate: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none foucs:ring-1 focus:ring-green-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                        Finale date <span className="text-gray-600">(optional)</span>
                                    </label>
                                    <input 
                                        type="date"
                                        value={form.finaleDate}
                                        onChange={e => setForm(prev => ({ ...prev, finaleDate: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none foucs:ring-1 focus:ring-green-600"
                                    />
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                                    className={`relative w-10 h-5 rounded-full transition-colors ${
                                        form.isActive ? 'bg-green-600' : 'bg-gray-700'
                                    }`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                       form.isActive ? 'translate-x-5' : 'translate-x-0.5' 
                                    }`}/>    
                                </button>
                                <label className="text-sm text-gray-300">
                                    Active season
                                </label>
                            </div>

                            {formError && (
                                <p className="text-xs text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
                                    {formError}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={() => {
                                    setShowCreate(false)
                                    setEditingSeason(null)
                                    setFormError(null)
                                }}
                                disabled={formLoading}
                                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={formLoading}
                                className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
                            >
                                {formLoading ? 'Saving...' : editingSeason ? 'Save Changes' : 'Add Season'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm dialog */}
            {confirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 boder border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
                        <h3 className="text-base font-medium text-white mb-2">{confirm.title}</h3>
                        <p className="text-sm text-gray-400 mb-6">{confirm.message}</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirm(null)}
                                disabled={confirmLoading}
                                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirm.onConfirm}
                                disabled={confirmLoading}
                                className="px-4 py-2 text-sm rounded-lg bg-red-700 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                { confirmLoading ? 'Deleting...' : confirm.confirmLabel }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}