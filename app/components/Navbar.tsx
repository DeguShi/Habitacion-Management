'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { LogOut, Download, Loader2, Upload } from 'lucide-react'
import { useState } from 'react'
import RestoreModal from './RestoreModal'

type ExportResultState = {
  status: 'success' | 'warning' | 'error';
  count?: number;
  failedCount?: number;
} | null;

export default function Navbar() {
  const { data: session } = useSession()
  const avatar = session?.user?.image
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState<ExportResultState>(null)
  const [showRestoreModal, setShowRestoreModal] = useState(false)

  async function handleExportBackup() {
    if (exporting) return
    setExporting(true)
    setExportResult(null)

    try {
      // Fetch CSV first
      const csvRes = await fetch('/api/backup/reservations.csv')
      if (!csvRes.ok) {
        throw new Error('CSV export failed')
      }

      // Get counts from CSV response
      const count = parseInt(csvRes.headers.get('X-Export-Count') || '0', 10)
      const failedCount = parseInt(csvRes.headers.get('X-Export-Failed-Count') || '0', 10)

      // Download CSV immediately
      const csvBlob = await csvRes.blob()
      const csvFilename = csvRes.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'backup.csv'
      downloadBlob(csvBlob, csvFilename)

      // Wait 500ms before second download to avoid browser blocking
      await new Promise(resolve => setTimeout(resolve, 500))

      // Fetch NDJSON second
      const ndjsonRes = await fetch('/api/backup/reservations.ndjson')
      if (!ndjsonRes.ok) {
        throw new Error('NDJSON export failed')
      }

      // Download NDJSON
      const ndjsonBlob = await ndjsonRes.blob()
      const ndjsonFilename = ndjsonRes.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'backup.ndjson'
      downloadBlob(ndjsonBlob, ndjsonFilename)

      // Determine result status based on failed count
      if (failedCount > 0) {
        // Partial export: some reservations failed to fetch
        setExportResult({ status: 'warning', count, failedCount })
        setTimeout(() => setExportResult(null), 8000) // Longer display for warning
      } else {
        // Full success
        setExportResult({ status: 'success', count })
        setTimeout(() => setExportResult(null), 3000)
      }
    } catch (err) {
      console.error('Export failed:', err)
      setExportResult({ status: 'error' })
      setTimeout(() => setExportResult(null), 5000)
    } finally {
      setExporting(false)
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo-hab.png" alt="" width={32} height={32} className="rounded-md" priority />
            <span className="font-semibold">Habitación Familiar Lisiani y Airton</span>
          </Link>

          {session?.user ? (
            <div className="flex items-center gap-3">
              {/* Export result toast */}
              {exportResult && (
                <span
                  className={`text-xs px-2 py-1 rounded ${exportResult.status === 'success'
                    ? 'bg-green-100 text-green-700'
                    : exportResult.status === 'warning'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-700'
                    }`}
                >
                  {exportResult.status === 'success'
                    ? `✓ ${exportResult.count} reservas exportadas`
                    : exportResult.status === 'warning'
                      ? `⚠ Exportação parcial: ${exportResult.count} ok, ${exportResult.failedCount} falharam`
                      : 'Falha ao exportar'}
                </span>
              )}

              {/* Export backup button */}
              <button
                onClick={handleExportBackup}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm active:translate-y-[1px] transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Exportar backup (CSV + NDJSON)"
              >
                {exporting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                <span className="hidden sm:inline">
                  {exporting ? 'Exportando...' : 'Backup'}
                </span>
              </button>

              {/* Restore button */}
              <button
                onClick={() => setShowRestoreModal(true)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm active:translate-y-[1px] transition"
                title="Restaurar backup (NDJSON)"
              >
                <Upload size={16} />
                <span className="hidden sm:inline">Restaurar</span>
              </button>

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
                  <div className="h-7 w-7 rounded-full bg-gray-100 ring-1 ring-gray-200 grid place-items-center text-xs font-medium">
                    {session.user.email?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                )}
                <span className="text-sm text-gray-600">{session.user.email}</span>
              </div>

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

      {/* Restore Modal */}
      <RestoreModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
      />
    </>
  )
}