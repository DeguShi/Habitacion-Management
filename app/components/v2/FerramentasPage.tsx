'use client'

import { useState, useEffect } from 'react'
import { Download, Upload, FileSpreadsheet, FileJson, Smartphone, RefreshCw, Wifi, WifiOff, Check, AlertTriangle } from 'lucide-react'
import RestoreModal from '@/app/components/RestoreModal'

interface FerramentasPageProps {
    canWrite: boolean
}

// BeforeInstallPromptEvent type for PWA
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function FerramentasPage({ canWrite }: FerramentasPageProps) {
    const [restoreOpen, setRestoreOpen] = useState(false)
    const [exporting, setExporting] = useState<'csv' | 'ndjson' | null>(null)

    // PWA Install state
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [isStandalone, setIsStandalone] = useState(false)

    // Sync state (client-only)
    const [isOnline, setIsOnline] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)
    const [lastSync, setLastSync] = useState<string | null>(null)
    const [pendingCount, setPendingCount] = useState(0)

    useEffect(() => {
        // Check if already installed (standalone mode)
        const checkStandalone = () => {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true
            setIsStandalone(isStandaloneMode)
            setIsInstalled(isStandaloneMode)
        }
        checkStandalone()

        // Listen for install prompt
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }
        window.addEventListener('beforeinstallprompt', handleBeforeInstall)

        // Listen for app installed
        const handleAppInstalled = () => {
            setIsInstalled(true)
            setDeferredPrompt(null)
        }
        window.addEventListener('appinstalled', handleAppInstalled)

        // Network status
        const updateOnline = () => setIsOnline(navigator.onLine)
        setIsOnline(navigator.onLine)
        window.addEventListener('online', updateOnline)
        window.addEventListener('offline', updateOnline)

        // Check sync status from IndexedDB (if available)
        checkSyncStatus()

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
            window.removeEventListener('appinstalled', handleAppInstalled)
            window.removeEventListener('online', updateOnline)
            window.removeEventListener('offline', updateOnline)
        }
    }, [])

    async function checkSyncStatus() {
        try {
            // Dynamic import to avoid SSR issues
            const { ensureSyncState, getPendingCount } = await import('@/lib/offline/db')
            const syncState = await ensureSyncState()
            const pending = await getPendingCount()
            setLastSync(syncState.lastFullSyncAt || null)
            setPendingCount(pending)
        } catch (e) {
            console.log('[Tools] IndexedDB not available:', e)
        }
    }

    async function handleInstallPWA() {
        if (!deferredPrompt) return

        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
            setIsInstalled(true)
        }
        setDeferredPrompt(null)
    }

    async function handleSyncNow() {
        if (!isOnline || isSyncing) return

        setIsSyncing(true)
        try {
            const { executeSync } = await import('@/lib/offline/sync')
            await executeSync()
            await checkSyncStatus()
        } catch (e) {
            console.error('[Tools] Sync failed:', e)
        } finally {
            setIsSyncing(false)
        }
    }

    async function handleExportCSV() {
        setExporting('csv')
        try {
            const res = await fetch('/api/backup/reservations.csv')
            if (!res.ok) throw new Error('Export failed')

            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `reservas_${new Date().toISOString().slice(0, 10)}.csv`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch (e) {
            console.error('Export failed:', e)
            alert('Erro ao exportar CSV')
        } finally {
            setExporting(null)
        }
    }

    async function handleExportNDJSON() {
        setExporting('ndjson')
        try {
            const res = await fetch('/api/backup/reservations.ndjson')
            if (!res.ok) throw new Error('Export failed')

            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `reservas_backup_${new Date().toISOString().slice(0, 10)}.ndjson`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch (e) {
            console.error('Export failed:', e)
            alert('Erro ao exportar NDJSON')
        } finally {
            setExporting(null)
        }
    }

    function formatLastSync(isoString: string | null): string {
        if (!isoString) return 'Nunca'
        const date = new Date(isoString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 1) return 'Agora'
        if (diffMins < 60) return `${diffMins} min atrás`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h atrás`
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }

    return (
        <div className="pb-20 space-y-4">
            {/* PWA Install Section */}
            <section className="card">
                <h2 className="text-lg font-semibold mb-4 text-gray-900">Aplicativo</h2>

                <div className="grid gap-3">
                    {/* Install Button */}
                    {!isInstalled && !isStandalone && (
                        <button
                            onClick={handleInstallPWA}
                            disabled={!deferredPrompt}
                            className="mini-card w-full flex items-center gap-3 p-4 disabled:opacity-50"
                        >
                            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                                <Smartphone size={20} />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="font-medium text-gray-900">Instalar aplicativo</div>
                                <div className="text-xs text-gray-500">
                                    {deferredPrompt
                                        ? 'Adicionar à tela inicial'
                                        : 'Use Safari → Compartilhar → Adicionar à Tela Inicial'}
                                </div>
                            </div>
                        </button>
                    )}

                    {isInstalled && (
                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                            <div className="p-2 rounded-lg bg-green-100 text-green-600">
                                <Check size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-green-800">Aplicativo instalado</div>
                                <div className="text-xs text-green-600">
                                    Funciona offline após a primeira sincronização
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sync Status */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                        <div className={`p-2 rounded-lg ${isOnline ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                            {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-gray-900">
                                {isOnline ? 'Online' : 'Offline'}
                                {pendingCount > 0 && (
                                    <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                                        {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-gray-500">
                                Última sincronização: {formatLastSync(lastSync)}
                            </div>
                        </div>
                        {isOnline && (
                            <button
                                onClick={handleSyncNow}
                                disabled={isSyncing}
                                className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50"
                                title="Sincronizar agora"
                            >
                                <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* Tools Section */}
            <section className="card">
                <h2 className="text-lg font-semibold mb-4 text-gray-900">Backup e Restauração</h2>

                <div className="grid gap-3 lg:grid-cols-2">
                    {/* Export CSV */}
                    <button
                        onClick={handleExportCSV}
                        disabled={exporting === 'csv'}
                        className="mini-card w-full flex items-center gap-3 p-4 disabled:opacity-50"
                    >
                        <div className="p-2 rounded-lg bg-green-100 text-green-600">
                            <FileSpreadsheet size={20} />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-medium text-gray-900">Exportar CSV</div>
                            <div className="text-xs text-gray-500">
                                Planilha compatível com Excel
                            </div>
                        </div>
                        <Download size={16} className="text-gray-400" />
                    </button>

                    {/* Export NDJSON */}
                    <button
                        onClick={handleExportNDJSON}
                        disabled={exporting === 'ndjson'}
                        className="mini-card w-full flex items-center gap-3 p-4 disabled:opacity-50"
                    >
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                            <FileJson size={20} />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-medium text-gray-900">Exportar NDJSON</div>
                            <div className="text-xs text-gray-500">
                                Backup completo para restauração
                            </div>
                        </div>
                        <Download size={16} className="text-gray-400" />
                    </button>

                    {/* Restore */}
                    <button
                        onClick={() => setRestoreOpen(true)}
                        disabled={!canWrite}
                        className="mini-card w-full flex items-center gap-3 p-4 disabled:opacity-50 lg:col-span-2"
                    >
                        <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                            <Upload size={20} />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-medium text-gray-900">Restaurar backup</div>
                            <div className="text-xs text-gray-500">
                                Importar arquivo NDJSON
                            </div>
                        </div>
                    </button>
                </div>

                {!canWrite && (
                    <p className="text-xs text-gray-500 text-center mt-3">
                        Restauração requer permissão de escrita
                    </p>
                )}
            </section>

            {/* Restore Modal */}
            {restoreOpen && (
                <RestoreModal
                    isOpen={restoreOpen}
                    onClose={() => setRestoreOpen(false)}
                />
            )}
        </div>
    )
}

