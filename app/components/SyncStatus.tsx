'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Wifi, WifiOff, AlertTriangle, Check } from 'lucide-react'
import { subscribeNetworkStatus, initNetworkDetection, isOnline } from '@/lib/offline/network'
import { getPendingCount, getConflictCount, ensureSyncState } from '@/lib/offline/db'

type SyncStatus = 'online' | 'offline' | 'syncing' | 'error' | 'conflict'

interface SyncInfo {
    status: SyncStatus
    pendingCount: number
    conflictCount: number
    lastSyncAt?: string
}

export default function SyncStatusBadge() {
    const [info, setInfo] = useState<SyncInfo>({
        status: 'online',
        pendingCount: 0,
        conflictCount: 0,
    })

    useEffect(() => {
        // Initialize network detection
        initNetworkDetection()

        // Subscribe to network status
        const unsubscribe = subscribeNetworkStatus((online) => {
            setInfo(prev => ({
                ...prev,
                status: online ? 'online' : 'offline',
            }))
        })

        // Initial status check
        async function checkStatus() {
            try {
                const [pending, conflicts, syncState] = await Promise.all([
                    getPendingCount(),
                    getConflictCount(),
                    ensureSyncState(),
                ])

                setInfo(prev => ({
                    ...prev,
                    status: isOnline() ? (conflicts > 0 ? 'conflict' : 'online') : 'offline',
                    pendingCount: pending,
                    conflictCount: conflicts,
                    lastSyncAt: syncState.lastFullSyncAt,
                }))
            } catch (e) {
                console.error('[SyncStatus] Failed to check status:', e)
            }
        }

        checkStatus()

        // Re-check periodically
        const interval = setInterval(checkStatus, 10000) // Every 10 seconds

        return () => {
            unsubscribe()
            clearInterval(interval)
        }
    }, [])

    // Format last sync time
    function formatLastSync(isoString?: string): string {
        if (!isoString) return 'Nunca'

        const date = new Date(isoString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)

        if (diffMins < 1) return 'Agora'
        if (diffMins < 60) return `${diffMins} min`

        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h`

        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }

    const handleSyncNow = async () => {
        if (!isOnline()) return

        // TODO: Implement triggerSync when sync.ts is ready
        console.log('[SyncStatus] Manual sync requested')
    }

    // Render based on status
    const statusConfig = {
        online: {
            icon: <Check size={14} />,
            color: 'text-green-600',
            bg: 'bg-green-50',
            label: 'Online',
        },
        offline: {
            icon: <WifiOff size={14} />,
            color: 'text-gray-600',
            bg: 'bg-gray-100',
            label: 'Offline',
        },
        syncing: {
            icon: <RefreshCw size={14} className="animate-spin" />,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            label: 'Sincronizando',
        },
        error: {
            icon: <AlertTriangle size={14} />,
            color: 'text-red-600',
            bg: 'bg-red-50',
            label: 'Erro',
        },
        conflict: {
            icon: <AlertTriangle size={14} />,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            label: 'Conflitos',
        },
    }

    const config = statusConfig[info.status]

    return (
        <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
            title={`Última sincronização: ${formatLastSync(info.lastSyncAt)}`}
        >
            {config.icon}
            <span>{config.label}</span>

            {/* Pending count */}
            {info.pendingCount > 0 && (
                <span className="bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full text-[10px]">
                    {info.pendingCount} pendente{info.pendingCount > 1 ? 's' : ''}
                </span>
            )}

            {/* Conflict count */}
            {info.conflictCount > 0 && (
                <span className="bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full text-[10px]">
                    {info.conflictCount} conflito{info.conflictCount > 1 ? 's' : ''}
                </span>
            )}

            {/* Sync button when online */}
            {isOnline() && (
                <button
                    onClick={handleSyncNow}
                    className="p-1 hover:bg-black/5 rounded-full transition-colors"
                    title="Sincronizar agora"
                >
                    <RefreshCw size={12} />
                </button>
            )}
        </div>
    )
}
