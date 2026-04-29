'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'

const navItems = [
    {
        href: '/dashboard',
        label: 'Dashboard',
        icon: (
            <svg width="16" height="16" viewBox='0 0 16 16' fill="currentColor">
                <rect x='1' y='1' width='6' height='6' rx='1' />
                <rect x='9' y='1' width='6' height='6' rx='1' />
                <rect x='1' y='9' width='6' height='6' rx='1' />
                <rect x='9' y='9' width='6' height='6' rx='1' />
            </svg>
        ),
    },
    {
        href: '/dashboard/my-team',
        label: 'My Team',
        icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="5" r="3"/>
                <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" />
            </svg>
        ),
    },
    { href: '/dashboard/league',
        label: "League",
        icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1l1.5 4.5H14l-3.75 2.75 1.5 4.5L8 10l-3.75 2.75 1.5-4.5L2 5.5h4.5z" />
            </svg>
        ),
    },
    {
        href: '/dashboard/players',
        label: 'Players',
        icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5" cy="5" r="2.5"/>
                <circle cx="11" cy="5" r="2.5"/>
                <path d="M1 13c0-2.21 1.79-4 4-4s4 1.79 4 4" />
                <path d="M1 13c0-2.21 1.79-4 4-4s4 1.79 4 4" />
            </svg>
        ),
    },
    {
        href: '/dashboard/fixtures',
        label: 'Fixtures',
        icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="3" width="14" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M1 7h14" stroke="currentColor" strokeWidth="1" />
                <path d="M5 1v4M11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
    },
]

const accountItems = [
    {
        href: '/dashboard/settings',
        label: 'Settings',
        icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" />
                <path d="M13.3 9.31.9-1.3-1.492.491.6.5a5 5 0 00-.9-.5L10 4H7.9l-.3 1.6a5 5" />
            </svg>
        ),
    },
]

export default function Sidebar() {
    const pathname = usePathname()

    return(
        <aside className="w-56 bg-white border-r border-gray-100 flex flex-col h-full">
            { /* Logo */ }
            <div className="px-4 py-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-green-800 rounded-md flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5"/>
                            <path d="M5 8 L8 5 L1l 8 L8 1l Z" fill="white"/>
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Pierson Fantasy</span>
                </div>
            </div>

            { /* Nav */ }
            <nav className="flex-1 p-2 space-y-0.5">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={"flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive? 'bg-green-50 text-green-800 font-medium': 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}"}
                        >
                            <span className={isActive ? 'text-green-800' : 'text-gray-400'}>
                                {item.icon}
                            </span>
                            {item.label}
                        </Link>
                    )
                })}

                <div className="pt-4">
                    <p className="px-3 pb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Account
                    </p>
                    {accountItems.map((item) => {
                        const isActive = pathname === item.href 
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={"flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-green-50 text-green-800 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-400'}"}
                            >
                                <span className={isActive ? 'text-green-800' : 'text-gray-400'}>
                                    {item.icon}
                                </span>
                                {item.label}
                            </Link>
                        )
                    })}
                </div>
            </nav>


            { /* USER */ }
            <div className="p-3 border-t border-gray-100">
                <div className="flex items-center gap-2.5 px-2 py-1.5">
                    <UserButton />
                    <span className="text-sm text-gray-600">Account</span>
                </div>
            </div>
        </aside>
    )
}