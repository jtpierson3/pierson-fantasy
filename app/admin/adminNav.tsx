'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { useState } from 'react'

type Props = {
    isSiteAdmin: boolean
    username: string
}

const LEAGUE_ADMIN_LINKS = [
    { href: '/admin/users', label: 'Users'},
    { href: '/admin/league', label: 'League'},
]

const SITE_ADMIN_LINKS = [
    { href: '/admin/sync', label: 'Sync'},
    { href: '/admin/transfers', label: 'Transfers' },
    { href: '/admin/survivor', label: 'Survivor' },
    { href: '/admin/survivor/leagues', label: 'Survivor Leagues' },
    { href: '/admin/survivor/challenges', label: 'Challenge Library' }
]

export default function AdminNav({ isSiteAdmin, username}: Props) {
    const pathname = usePathname()
    const [siteAdminMode, setSiteAdminMode] = useState(false)

    const links = [
        ...LEAGUE_ADMIN_LINKS,
        ...(isSiteAdmin && siteAdminMode ? SITE_ADMIN_LINKS : [])
    ]

    return (
        <div className="bg-gray-900 border-b border-gray-800">
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex items-center justify-between h-14">
                    {/* Logo */}
                    <div className="flex items-cneter gap-6">
                        <Link href="/admin" className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="white">
                                    <path d="M8 1l1.5 4.5H14l-3.75 2.75 1.5 4.5L8 10l-3.75 2.75 1.5-4.5L2 5.5h4.5z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-white">Admin</span>
                        </Link>

                        {/* Nav Links */}
                        <div className="flex items-center gap-1">
                            {links.map(link => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`px-3 py-1.5 text-sm rounded-md transtion-colors ${
                                        pathname === link.href
                                            ? 'bg-gray-800 text-white'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-4">
                        {/* Site Admin Toggle */}
                        {isSiteAdmin && (
                            <button
                                onClick={() => setSiteAdminMode(prev => !prev)}
                                className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border transtition-colors ${
                                    siteAdminMode
                                        ? 'bg-green-900 border-green-700 text-green-400'
                                        : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                                }`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${siteAdminMode ? 'bg-green-400' : 'bg-gray-600'}`} />
                                Site Admin
                            </button>
                        )}

                        {/* Back to App */}
                        <Link
                            href="/dashboard"
                            className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                            Back to App
                        </Link>

                        <span className="text-xs text-gray-500">{username}</span>
                        <UserButton />
                    </div>
                </div>
            </div>
        </div>
    )
}