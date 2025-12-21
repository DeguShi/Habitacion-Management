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
    const { theme, setTheme, resolvedTheme } = useTheme()

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
                <h2 className="text-lg font-semibold mb-3">Aparência</h2>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => setTheme('light')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${theme === 'light'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Sun size={20} className={theme === 'light' ? 'text-blue-600' : 'text-gray-500'} />
                        <span className="text-xs font-medium">Claro</span>
                    </button>
                    <button
                        onClick={() => setTheme('dark')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${theme === 'dark'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Moon size={20} className={theme === 'dark' ? 'text-blue-600' : 'text-gray-500'} />
                        <span className="text-xs font-medium">Escuro</span>
                    </button>
                    <button
                        onClick={() => setTheme('system')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${theme === 'system'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Monitor size={20} className={theme === 'system' ? 'text-blue-600' : 'text-gray-500'} />
                        <span className="text-xs font-medium">Sistema</span>
                    </button>
                </div>
            </section>

            {/* Tools Section */}
            <section className="card">
                <h2 className="text-lg font-semibold mb-4">Ferramentas</h2>


                <div className="space-y-3">
                    {/* Export CSV */}
                    <button
                        onClick={handleExportCSV}
                        disabled={exporting === 'csv'}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-white shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-white shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-white shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
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

                    {!canWrite && (
                        <p className="text-xs text-gray-400 text-center mt-2">
                            Restauração requer permissão de escrita
                        </p>
                    )}
                </div>
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
