// app/page.tsx - Offline-aware entry point
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getOfflineUser, setOfflineUser, type OfflineUser } from '@/lib/offline/auth'
import { initOfflineSystem, hasLocalData } from '@/lib/offline/init'
import { isOnline } from '@/lib/offline/network'
import ClientShellV2 from '@/app/components/v2/ClientShellV2'

export default function Page() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [offlineUser, setOfflineUserState] = useState<OfflineUser | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [hasData, setHasData] = useState(false)
  const [initDone, setInitDone] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check offline state on mount
  useEffect(() => {
    const checkOffline = async () => {
      const offline = !isOnline()
      setIsOffline(offline)

      const cached = getOfflineUser()
      setOfflineUserState(cached)
      if (cached) {
        setIsAdmin(cached.isAdmin)
      }

      const data = await hasLocalData()
      setHasData(data)

      setInitDone(true)
    }

    checkOffline()

    // Listen for online/offline changes
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Check admin status and initialize offline system when online
  useEffect(() => {
    if (session?.user?.email && status === 'authenticated') {
      // Check admin status via API (server-side validation)
      fetch('/api/reservations', { method: 'HEAD' })
        .then(res => {
          // If we get 403, user is not admin; otherwise they are
          const adminStatus = res.status !== 403
          setIsAdmin(adminStatus)
          // Cache for offline use
          const email = session.user!.email!
          const name = session.user?.name ?? undefined
          setOfflineUser(email, name, adminStatus)
          initOfflineSystem(email, name, adminStatus)
        })
        .catch(() => {
          // Network error, use cached admin status if available
          const cached = getOfflineUser()
          if (cached) setIsAdmin(cached.isAdmin)
        })
    }
  }, [session, status])

  // Wait for initial checks
  if (!initDone) {
    return (
      <div className="min-h-screen eco-bg flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  // Determine auth state
  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'

  // Offline mode: use cached user if available
  if (isOffline && offlineUser && hasData) {
    return (
      <ClientShellV2
        canWrite={offlineUser.isAdmin}
        demoMode={!offlineUser.isAdmin}
        offlineMode={true}
      />
    )
  }

  // Online but loading
  if (isLoading) {
    return (
      <div className="min-h-screen eco-bg flex items-center justify-center">
        <div className="text-gray-500">Verificando...</div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    // If offline with no cached user, show offline message
    if (isOffline) {
      return (
        <div className="min-h-screen eco-bg flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-xl mb-2">📴 Você está offline</div>
            <div className="text-gray-500">
              Conecte-se à internet para fazer login
            </div>
          </div>
        </div>
      )
    }

    router.push('/sign-in')
    return null
  }

  // Authenticated and online
  return <ClientShellV2 canWrite={isAdmin} demoMode={!isAdmin} />
}