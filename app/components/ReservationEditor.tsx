// app/components/ReservationEditor.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ensureAdminKey } from '@/lib/admin'

type ReservationItem = {
  id?: string
  guestName: string
  phone?: string
  email?: string
  partySize: number
  checkIn: string            // YYYY-MM-DD
  checkOut?: string          // derived as +1 day on save
  breakfastIncluded: boolean
  nightlyRate: number        // per-person/night
  breakfastPerPersonPerNight: number
  manualLodgingEnabled?: boolean
  manualLodgingTotal?: number
  depositPaid: boolean
  notes?: string
}

export default function ReservationEditor(props: {
  open: boolean
  mode: 'create' | 'edit'
  initial?: ReservationItem
  defaultDate?: string
  onClose: () => void
  onSaved: () => void
  /** optional: notify parent when form becomes dirty/clean */
  onDirtyChange?: (dirty: boolean) => void
  /** optional (edit mode): switch to a read-only viewer outside this component */
  onSwitchToView?: () => void
}) {
  const { open, mode, initial, defaultDate, onClose, onSaved, onDirtyChange, onSwitchToView } = props

  const [m, setM] = useState<ReservationItem>({
    guestName: '',
    phone: '',
    email: '',
    partySize: 1,
    checkIn: defaultDate ?? isoToday(),
    breakfastIncluded: false,
    nightlyRate: 100,
    breakfastPerPersonPerNight: 10,
    manualLodgingEnabled: false,
    manualLodgingTotal: undefined,
    depositPaid: false,
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // snapshot to detect "dirty" accurately
  const initialSnapshotRef = useRef<string>('')

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && initial) {
      const next: ReservationItem = {
        ...initial,
        manualLodgingEnabled: initial.manualLodgingEnabled ?? false,
        manualLodgingTotal: initial.manualLodgingTotal,
      }
      setM(next)
      initialSnapshotRef.current = JSON.stringify(next)
    } else {
      const next = {
        guestName: '',
        phone: '',
        email: '',
        partySize: 1,
        checkIn: defaultDate ?? isoToday(),
        breakfastIncluded: false,
        nightlyRate: 100,
        breakfastPerPersonPerNight: 10,
        manualLodgingEnabled: false,
        manualLodgingTotal: undefined,
        depositPaid: false,
        notes: '',
      }
      setM(next)
      initialSnapshotRef.current = JSON.stringify(next)
    }
    setError(null)
    setSaving(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initial, defaultDate])

  // Close with Esc (with dirty guard)
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') maybeClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, m])

  const isDirty = useMemo(
    () => open && JSON.stringify(m) !== initialSnapshotRef.current,
    [open, m]
  )

  // notify parent when dirty state toggles
  useEffect(() => {
    onDirtyChange?.(!!isDirty)
  }, [isDirty, onDirtyChange])

  const nights = 1 // v1: always one night

  const computedTotal = useMemo(() => {
    const lodging = m.manualLodgingEnabled
      ? Number(m.manualLodgingTotal ?? 0)
      : nights * m.nightlyRate * m.partySize

    const breakfast = m.breakfastIncluded
      ? nights * m.partySize * m.breakfastPerPersonPerNight
      : 0

    return round2(lodging + breakfast)
  }, [m, nights])

  const computedDeposit = useMemo(() => round2(computedTotal * 0.5), [computedTotal])

  function maybeClose() {
    if (isDirty && !confirm('Existem alterações não salvas. Deseja sair sem salvar?')) {
      return
    }
    onClose()
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const adminKey = await ensureAdminKey()
        if (!adminKey) {
        setError('É necessário informar a senha de administrador para salvar.')
        setSaving(false)
        return
        }

      const payload = {
        ...m,
        checkOut: addDaysISO(m.checkIn, 1),
        // normalize manual lodging fields
        manualLodgingEnabled: !!m.manualLodgingEnabled,
        manualLodgingTotal: m.manualLodgingEnabled
          ? Number(m.manualLodgingTotal ?? 0)
          : undefined,
      }

      const res = await fetch(
        mode === 'create' ? '/api/reservations' : `/api/reservations/${initial?.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey,
          },
          body: JSON.stringify(payload),
        }
      )

      if (!res.ok) {
        const msg = await safeMsg(res)
        throw new Error(msg || 'Save failed')
      }

      onSaved()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const canSave =
    m.guestName.trim().length > 0 &&
    m.partySize >= 1 &&
    /^\d{4}-\d{2}-\d{2}$/.test(m.checkIn) &&
    (!m.manualLodgingEnabled || Number(m.manualLodgingTotal ?? 0) >= 0)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4">
      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[85vh] overflow-y-auto">
        {/* Header (sticky) */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/80 px-5 py-4 backdrop-blur">
          <h2 className="text-lg font-semibold">
            {mode === 'create' ? 'Nova reserva' : 'Editar reserva'}
          </h2>
          <div className="flex items-center gap-2">
            {mode === 'edit' && onSwitchToView && (
              <button
                type="button"
                title="Ver"
                onClick={() => {
                  if (isDirty && !confirm('Existem alterações não salvas. Deseja sair sem salvar?')) return
                  onSwitchToView()
                }}
                className="rounded-full border p-1 shadow-sm transition hover:shadow"
              >
                {/* Eye icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            )}
            <button
              aria-label="Fechar"
              onClick={maybeClose}
              className="rounded-full border p-1 shadow-sm transition hover:shadow"
              title="Fechar"
            >
              {/* X icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body (scrollable area) */}
        <div className="px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span>Nome</span>
              <input
                value={m.guestName}
                onChange={(e) => setM({ ...m, guestName: e.target.value })}
                required
              />
            </label>

            <label className="flex flex-col gap-1">
              <span>Pessoas</span>
              <input
                type="number"
                min={1}
                value={m.partySize}
                onChange={(e) => setM({ ...m, partySize: Number(e.target.value || 1) })}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span>Check-in</span>
              <input
                type="date"
                value={m.checkIn}
                onChange={(e) => setM({ ...m, checkIn: e.target.value })}
                required
              />
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={m.breakfastIncluded}
                onChange={(e) => setM({ ...m, breakfastIncluded: e.target.checked })}
              />
              <span>Café da manhã</span>
            </label>

            <label className="flex flex-col gap-1">
              <span>Diária por pessoa (R$)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={m.nightlyRate}
                onChange={(e) => setM({ ...m, nightlyRate: Number(e.target.value || 0) })}
                disabled={m.manualLodgingEnabled}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span>Café por pessoa/noite (R$)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={m.breakfastPerPersonPerNight}
                onChange={(e) => setM({ ...m, breakfastPerPersonPerNight: Number(e.target.value || 0) })}
              />
            </label>

            <label className="col-span-full flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!m.manualLodgingEnabled}
                onChange={(e) => setM({ ...m, manualLodgingEnabled: e.target.checked })}
              />
              <span>Informar valor total da hospedagem manualmente</span>
            </label>

            {m.manualLodgingEnabled && (
              <label className="flex flex-col gap-1">
                <span>Total da hospedagem (R$)</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={m.manualLodgingTotal ?? 0}
                  onChange={(e) => setM({ ...m, manualLodgingTotal: Number(e.target.value || 0) })}
                />
              </label>
            )}

            <label className="flex flex-col gap-1">
              <span>Telefone</span>
              <input
                value={m.phone || ''}
                onChange={(e) => setM({ ...m, phone: e.target.value })}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span>Email</span>
              <input
                type="email"
                value={m.email || ''}
                onChange={(e) => setM({ ...m, email: e.target.value })}
              />
            </label>

            <label className="col-span-full flex items-center gap-2">
              <input
                type="checkbox"
                checked={m.depositPaid}
                onChange={(e) => setM({ ...m, depositPaid: e.target.checked })}
              />
              <span>Depósito pago (50%)</span>
            </label>

            <label className="col-span-full flex flex-col gap-1">
              <span>Observações</span>
              <textarea
                rows={3}
                value={m.notes || ''}
                onChange={(e) => setM({ ...m, notes: e.target.value })}
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 p-3">
            <div>Noites: <strong>1</strong></div>
            <div>Total estimado: <strong>{formatBRL(computedTotal)}</strong></div>
            <div>Depósito (50%): <strong>{formatBRL(computedDeposit)}</strong></div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer (sticky) */}
        <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t bg-white/80 px-5 py-4 backdrop-blur">
          <button onClick={maybeClose} className="rounded border px-4 py-2">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? 'Salvando…' : (mode === 'create' ? 'Salvar' : 'Atualizar')}
          </button>
        </div>
      </div>
    </div>
  )
}

function isoToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysISO(iso: string, days: number) {
  const [y,m,d] = iso.split('-').map(Number)
  const dt = new Date(y, m-1, d + days)
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}

function round2(n: number) { return Math.round(n * 100) / 100 }

function formatBRL(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

async function safeMsg(res: Response) {
  try { const j = await res.json(); return (j?.error as string) || '' } catch { return '' }
}