'use client'

import { useState } from 'react'
import { Download, Upload, FileSpreadsheet, FileJson, Sun, Moon, Monitor } from 'lucide-react'
import RestoreModal from '@/app/components/RestoreModal'
import { useTheme } from '@/app/components/ThemeProvider'

interface FerramentasPageProps {
    canWrite: boolean
}

export default function FerramentasPage({ canWrite }: FerramentasPageProps) {
    const [restoreOpen, setRestoreOpen] = useState(false)
    const [exporting, setExporting] = useState<'csv' | 'ndjson' | null>(null)
    const { theme, setTheme } = useTheme()

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

    return (
        <div className="pb-20 space-y-4">
            {/* Theme Section */}
            <section className="card">
                <h2 className="text-lg font-semibold mb-3 text-app">Aparência</h2>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => setTheme('light')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${theme === 'light'
                            ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                            : 'border-app hover:bg-surface2'
                            }`}
                    >
                        <Sun size={20} className={theme === 'light' ? 'text-primary' : 'text-muted'} />
                        <span className="text-xs font-medium text-app">Claro</span>
                    </button>
                    <button
                        onClick={() => setTheme('dark')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${theme === 'dark'
                            ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                            : 'border-app hover:bg-surface2'
                            }`}
                    >
                        <Moon size={20} className={theme === 'dark' ? 'text-primary' : 'text-muted'} />
                        <span className="text-xs font-medium text-app">Escuro</span>
                    </button>
                    <button
                        onClick={() => setTheme('system')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${theme === 'system'
                            ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                            : 'border-app hover:bg-surface2'
                            }`}
                    >
                        <Monitor size={20} className={theme === 'system' ? 'text-primary' : 'text-muted'} />
                        <span className="text-xs font-medium text-app">Sistema</span>
                    </button>
                </div>
            </section>

            {/* Tools Section */}
            <section className="card">
                <h2 className="text-lg font-semibold mb-4 text-app">Ferramentas</h2>

                <div className="grid gap-3 lg:grid-cols-2">
                    {/* Export CSV */}
                    <button
                        onClick={handleExportCSV}
                        disabled={exporting === 'csv'}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-surface2 hover:bg-surface3 transition-colors disabled:opacity-50"
                    >
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40 text-success">
                            <FileSpreadsheet size={20} />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-medium text-app">Exportar CSV</div>
                            <div className="text-xs text-muted">
                                Planilha compatível com Excel
                            </div>
                        </div>
                        <Download size={16} className="text-muted" />
                    </button>

                    {/* Export NDJSON */}
                    <button
                        onClick={handleExportNDJSON}
                        disabled={exporting === 'ndjson'}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-surface2 hover:bg-surface3 transition-colors disabled:opacity-50"
                    >
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-primary">
                            <FileJson size={20} />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-medium text-app">Exportar NDJSON</div>
                            <div className="text-xs text-muted">
                                Backup completo para restauração
                            </div>
                        </div>
                        <Download size={16} className="text-muted" />
                    </button>

                    {/* Restore */}
                    <button
                        onClick={() => setRestoreOpen(true)}
                        disabled={!canWrite}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-surface2 hover:bg-surface3 transition-colors disabled:opacity-50 lg:col-span-2"
                    >
                        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/40 text-warning">
                            <Upload size={20} />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-medium text-app">Restaurar backup</div>
                            <div className="text-xs text-muted">
                                Importar arquivo NDJSON
                            </div>
                        </div>
                    </button>
                </div>

                {!canWrite && (
                    <p className="text-xs text-muted text-center mt-3">
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
