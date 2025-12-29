// app/page.tsx - Offline-aware entry point
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { getOfflineUser, setOfflineUser, type OfflineUser } from '@/lib/offline/auth'
import { initOfflineSystem, hasLocalData } from '@/lib/offline/init'
import { isOnline } from '@/lib/offline/network'
import { executeSync } from '@/lib/offline/sync'
import ClientShellV2 from '@/app/components/v2/ClientShellV2'

export default function Page() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  const [offlineUser, setOfflineUserState] = useState<OfflineUser | null>(null)
  const [currentlyOffline, setCurrentlyOffline] = useState(false)
  const [hasData, setHasData] = useState(false)
  const [initDone, setInitDone] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  // Check offline state and cache on mount
  useEffect(() => {
    const checkOffline = async () => {
      const offline = !isOnline()
      setCurrentlyOffline(offline)
      setWasOffline(offline)

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
  }, [])

  // Handle online/offline transitions
  useEffect(() => {
    const handleOnline = async () => {
      console.log('[Page] Network online detected')
      setCurrentlyOffline(false)

      // If we were offline and now online, trigger sync and refresh
      if (wasOffline) {
        console.log('[Page] Recovering from offline mode')
        setWasOffline(false)

        // Trigger sync to push pending changes
        try {
          await executeSync()
        } catch (e) {
          console.error('[Page] Sync error:', e)
        }

        // Refresh the session
        updateSession()
      }
    }

    const handleOffline = () => {
      console.log('[Page] Network offline detected')
      setCurrentlyOffline(true)
      setWasOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline, updateSession])

  // Check admin status and initialize offline system when authenticated
  useEffect(() => {
    if (session?.user?.email && status === 'authenticated' && !currentlyOffline) {
      // Check admin status via API (server-side validation)
      fetch('/api/reservations', { method: 'HEAD' })
        .then(res => {
          const adminStatus = res.status !== 403
          setIsAdmin(adminStatus)
          const email = session.user!.email!
          const name = session.user?.name ?? undefined
          setOfflineUser(email, name, adminStatus)
          initOfflineSystem(email, name, adminStatus)
        })
        .catch(() => {
          // Network error, use cached admin status
          const cached = getOfflineUser()
          if (cached) setIsAdmin(cached.isAdmin)
        })
    }
  }, [session, status, currentlyOffline])

  // Wait for initial checks
  if (!initDone) {
    return (
      <div className="min-h-screen eco-bg flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'

  // OFFLINE MODE: Use cached user and local data
  if (currentlyOffline && offlineUser && hasData) {
    return (
      <ClientShellV2
        canWrite={offlineUser.isAdmin}
        demoMode={!offlineUser.isAdmin}
        offlineMode={true}
      />
    )
  }

  // OFFLINE BUT NO DATA: Show helpful message
  if (currentlyOffline && (!offlineUser || !hasData)) {
    return (
      <div className="min-h-screen eco-bg flex items-center justify-center p-4">
        <div className="text-center card p-6 max-w-sm">
          <div className="text-4xl mb-4">📴</div>
          <div className="text-xl font-semibold mb-2">Você está offline</div>
          <div className="text-gray-500 mb-4">
            {!offlineUser
              ? 'Conecte-se à internet para fazer login'
              : 'Nenhum dado em cache. Conecte-se para sincronizar.'
            }
          </div>
          <div className="text-xs text-gray-400">
            Quando conectar, o app sincronizará automaticamente
          </div>
        </div>
      </div>
    )
  }

  // ONLINE: Loading session
  if (isLoading) {
    return (
      <div className="min-h-screen eco-bg flex items-center justify-center">
        <div className="text-gray-500">Verificando...</div>
      </div>
    )
  }

  // ONLINE: Not authenticated - redirect to login
  if (!isAuthenticated) {
    router.push('/sign-in')
    return null
  }

  // ONLINE: Authenticated - show app
  return <ClientShellV2 canWrite={isAdmin} demoMode={!isAdmin} />
}