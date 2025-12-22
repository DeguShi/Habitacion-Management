'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

/**
 * v1 Navbar - Clean minimal version (Phase 8.2)
 * Shows only logo, user info, and signout.
 */
export default function Navbar() {
  const { data: session } = useSession()
  const avatar = session?.user?.image

  return (
    <header className="sticky top-0 z-40 eco-surface backdrop-blur-sm border-b border-[var(--eco-border)]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/v1" className="flex items-center gap-3">
          <Image src="/logo-hab.png" alt="" width={32} height={32} className="rounded-md" priority />
          <span className="font-semibold text-gray-900">Habitación Familiar</span>
        </Link>

        {session?.user ? (
          <div className="flex items-center gap-3">
            {/* User info (hidden on mobile) */}
            <div className="hidden sm:flex items-center gap-2">
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

            {/* Logout button */}
            <button
              onClick={() => signOut({ callbackUrl: '/sign-in' })}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-rose-700 hover:bg-rose-50 hover:border-rose-300 hover:shadow-sm active:translate-y-[1px] transition"
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