'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signIn, signOut } from 'next-auth/react'
import { LogOut, Bell } from 'lucide-react'
import { useBirthdayBell } from '@/app/components/v2/BirthdayBellContext'

/**
 * Navbar - Shows logo, user info, birthday bell (on v2), and signout.
 */
export default function Navbar() {
  const { data: session } = useSession()
  const avatar = session?.user?.image
  const pathname = usePathname()
  const isV2 = pathname?.startsWith('/v2')

  // Birthday bell context (only active in v2)
  const { count, openSheet } = useBirthdayBell()

  return (
    <header className="sticky top-0 z-40 eco-surface backdrop-blur-sm border-b border-[var(--eco-border)]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo-hab.png" alt="" width={32} height={32} className="rounded-md" priority />
          <span className="font-semibold text-gray-900">Habitación Familiar</span>
        </Link>

        {session?.user ? (
          <div className="flex items-center gap-2">
            {/* User info (hidden on mobile) */}
            <div className="hidden sm:flex items-center gap-2 mr-1">
              {avatar ? (
                <Image
                  src={avatar}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full ring-1 ring-gray-200"
                />
              ) : (
                <div className="h-7 w-7 rounded-full eco-surface-alt ring-1 ring-[var(--eco-border)] grid place-items-center text-xs font-medium eco-text">
                  {session.user.email?.[0]?.toUpperCase() ?? 'U'}
                </div>
              )}
              <span className="text-sm text-gray-600">{session.user.email}</span>
            </div>

            {/* Birthday Bell */}
            <button
              onClick={openSheet}
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-full border border-amber-200 text-amber-700 bg-white hover:bg-amber-50 hover:border-amber-300 hover:shadow-sm active:translate-y-[1px] transition"
              title="Aniversários"
              aria-label="Aniversários da semana"
            >
              <Bell size={16} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>

            {/* Logout button */}
            <button
              onClick={() => signOut({ callbackUrl: '/sign-in' })}
              className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:px-3 sm:py-1.5 sm:gap-2 rounded-full border border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 hover:shadow-sm active:translate-y-[1px] transition"
              title="Sair"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        ) : (
          <button className="btn" onClick={() => signIn('google', { callbackUrl: '/' })}>
            Entrar
          </button>
        )}
      </div>
    </header>
  )
}