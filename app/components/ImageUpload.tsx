'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'

type Props = {
  value?: string | null
  onChange: (url: string) => void
  folder?: string
  placeholder?: string
}

export default function ImageUpload({
  value,
  onChange,
  folder = 'general',
  placeholder = 'Upload image',
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('folder', folder)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      onChange(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [folder, onChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }, [handleUpload])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }, [handleUpload])

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className={`relative border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-colors ${
          uploading
            ? 'border-gray-700 bg-gray-800/50'
            : 'border-gray-700 hover:border-green-600 bg-gray-800/30'
        }`}
        style={{ minHeight: '120px' }}
      >
        {value ? (
          <div className="relative w-full h-32">
            <Image
              src={value}
              alt="Uploaded image"
              fill
              className="object-cover object-[center_top]"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-xs text-white font-medium">Click to replace</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-400">Uploading...</p>
              </>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-xs text-gray-400">{placeholder}</p>
                <p className="text-xs text-gray-600">or drag and drop</p>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}