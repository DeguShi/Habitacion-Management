'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { LogOut, Download, Loader2 } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { data: session } = useSession()
  const avatar = session?.user?.image
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{ success: boolean; count?: number } | null>(null)

  async function handleExportBackup() {
    if (exporting) return
    setExporting(true)
    setExportResult(null)

    try {
      // Fetch both CSV and NDJSON
      const [csvRes, ndjsonRes] = await Promise.all([
        fetch('/api/backup/reservations.csv'),
        fetch('/api/backup/reservations.ndjson'),
      ])

      if (!csvRes.ok || !ndjsonRes.ok) {
        throw new Error('Export failed')
      }

      // Get export count from headers
      const count = parseInt(csvRes.headers.get('X-Export-Count') || '0', 10)

      // Download CSV
      const csvBlob = await csvRes.blob()
      const csvFilename = csvRes.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'backup.csv'
      downloadBlob(csvBlob, csvFilename)

      // Download NDJSON
      const ndjsonBlob = await ndjsonRes.blob()
      const ndjsonFilename = ndjsonRes.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'backup.ndjson'
      downloadBlob(ndjsonBlob, ndjsonFilename)

      setExportResult({ success: true, count })

      // Clear success message after 3 seconds
      setTimeout(() => setExportResult(null), 3000)
    } catch (err) {
      console.error('Export failed:', err)
      setExportResult({ success: false })
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
                className={`text-xs px-2 py-1 rounded ${exportResult.success
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                  }`}
              >
                {exportResult.success
                  ? `✓ ${exportResult.count} reservas exportadas`
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
  )
}