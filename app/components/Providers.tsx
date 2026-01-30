'use client'

import { NextAuthProvider } from '@/lib/auth.client'
import { BirthdayBellProvider } from '@/app/components/v2/BirthdayBellContext'
import Navbar from '@/app/components/Navbar'

/**
 * Client-side providers wrapper that includes:
 * - NextAuthProvider for authentication
 * - BirthdayBellProvider for birthday bell state (shared with Navbar)
 * - Navbar component
 */
export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <NextAuthProvider>
            <BirthdayBellProvider>
                <Navbar />
                {children}
            </BirthdayBellProvider>
        </NextAuthProvider>
    )
}
