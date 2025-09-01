// app/components/ReservationEditor.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

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
  onDirtyChange?: (dirty: boolean) => void
  onSwitchToView?: () => void
  /** when false, inputs are disabled and saves are blocked */
  canWrite?: boolean
}) {
  const {
    open, mode, initial, defaultDate, onClose, onSaved, onDirtyChange, onSwitchToView,
    canWrite = true,
  } = props

  // base, non-numeric fields
  const [m, setM] = useState<ReservationItem>({
    guestName: '',
    phone: '',
    email: '',
    partySize: 1,
    checkIn: defaultDate ?? isoToday(),
    breakfastIncluded: false,
    nightlyRate: 0,
    breakfastPerPersonPerNight: 0,
    manualLodgingEnabled: false,
    manualLodgingTotal: undefined,
    depositPaid: false,
    notes: '',
  })

  // draft strings so user can clear/leave empty while editing
  const [partyStr, setPartyStr] = useState<string>('')          // Pessoas
  const [nightlyStr, setNightlyStr] = useState<string>('')      // Diária por pessoa
  const [breakfastStr, setBreakfastStr] = useState<string>('')  // Café por pessoa/noite
  const [manualTotalStr, setManualTotalStr] = useState<string>('') // Total hospedagem manual

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      // load numeric drafts from existing values
      setPartyStr(String(initial.partySize ?? ''))
      setNightlyStr(String(initial.nightlyRate ?? ''))
      setBreakfastStr(String(initial.breakfastPerPersonPerNight ?? ''))
      setManualTotalStr(
        initial.manualLodgingEnabled ? String(initial.manualLodgingTotal ?? '') : ''
      )
      initialSnapshotRef.current = snapshot(next, {
        partyStr: String(initial.partySize ?? ''),
        nightlyStr: String(initial.nightlyRate ?? ''),
        breakfastStr: String(initial.breakfastPerPersonPerNight ?? ''),
        manualTotalStr:
          initial.manualLodgingEnabled ? String(initial.manualLodgingTotal ?? '') : '',
      })
    } else {
      const next: ReservationItem = {
        guestName: '',
        phone: '',
        email: '',
        partySize: 1,
        checkIn: defaultDate ?? isoToday(),
        breakfastIncluded: false,
        nightlyRate: 0,
        breakfastPerPersonPerNight: 0,
        manualLodgingEnabled: false,
        manualLodgingTotal: undefined,
        depositPaid: false,
        notes: '',
      }
      setM(next)
      // new form: leave numeric drafts empty
      setPartyStr('')
      setNightlyStr('')
      setBreakfastStr('')
      setManualTotalStr('')
      initialSnapshotRef.current = snapshot(next, {
        partyStr: '',
        nightlyStr: '',
        breakfastStr: '',
        manualTotalStr: '',
      })
    }
    setError(null)
    setSaving(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initial, defaultDate])

  // Esc closes (with dirty guard)
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') maybeClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, m, partyStr, nightlyStr, breakfastStr, manualTotalStr])

  const isDirty = useMemo(() => {
    if (!open) return false
    return (
      snapshot(m, { partyStr, nightlyStr, breakfastStr, manualTotalStr }) !==
      initialSnapshotRef.current
    )
  }, [open, m, partyStr, nightlyStr, breakfastStr, manualTotalStr])

  useEffect(() => {
    onDirtyChange?.(!!isDirty)
  }, [isDirty, onDirtyChange])

  const nights = 1 // v1

  // helpers to coerce numbers
  const partySizeNum = intOrNaN(partyStr)
  const nightlyNum = numOrNaN(nightlyStr)
  const breakfastNum = numOrNaN(breakfastStr)
  const manualTotalNum = numOrNaN(manualTotalStr)

  const computedTotal = useMemo(() => {
    const lodging = m.manualLodgingEnabled
      ? (isNaN(manualTotalNum) ? 0 : manualTotalNum)
      : nights * (isNaN(nightlyNum) ? 0 : nightlyNum) * (isNaN(partySizeNum) ? 0 : partySizeNum)

    const breakfast = m.breakfastIncluded
      ? nights * (isNaN(partySizeNum) ? 0 : partySizeNum) * (isNaN(breakfastNum) ? 0 : breakfastNum)
      : 0

    return round2(lodging + breakfast)
  }, [m.manualLodgingEnabled, m.breakfastIncluded, nights, partySizeNum, nightlyNum, breakfastNum, manualTotalNum])

  const computedDeposit = useMemo(() => round2(computedTotal * 0.5), [computedTotal])

  function maybeClose() {
    if (isDirty && !confirm('Existem alterações não salvas. Deseja sair sem salvar?')) return
    onClose()
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      if (!canWrite) {
        setError('Esta conta está em modo somente leitura (escritas restritas).')
        setSaving(false)
        return
      }

      // Validate required numbers
      const party = intOrNaN(partyStr)
      const nightly = numOrNaN(nightlyStr)
      const breakfast = numOrNaN(breakfastStr)
      const manualTotal = numOrNaN(manualTotalStr)

      if (isNaN(party) || party < 1) throw new Error('Informe o nº de pessoas')

      if (m.manualLodgingEnabled) {
        if (isNaN(manualTotal) || manualTotal < 0) {
          throw new Error('Informe o total da hospedagem')
        }
      } else {
        if (isNaN(nightly) || nightly < 0) {
          throw new Error('Informe a diária por pessoa')
        }
      }

      if (m.breakfastIncluded && (isNaN(breakfast) || breakfast < 0)) {
        throw new Error('Informe o valor do café')
      }

      const payload = {
        ...m,
        partySize: party,
        nightlyRate: isNaN(nightly) ? 0 : nightly,
        breakfastPerPersonPerNight: isNaN(breakfast) ? 0 : breakfast,
        checkOut: addDaysISO(m.checkIn, 1),
        manualLodgingEnabled: !!m.manualLodgingEnabled,
        manualLodgingTotal: m.manualLodgingEnabled
          ? (isNaN(manualTotal) ? 0 : manualTotal)
          : undefined,
      }

      const res = await fetch(
        mode === 'create' ? '/api/reservations' : `/api/reservations/${initial?.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          cache: 'no-store',
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
    /^\d{4}-\d{2}-\d{2}$/.test(m.checkIn) &&
    (partyStr === '' || intOrNaN(partyStr) >= 1) &&
    (!m.manualLodgingEnabled || manualTotalStr === '' || numOrNaN(manualTotalStr) >= 0) &&
    canWrite

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4">
      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span>Nome</span>
              <input
                value={m.guestName}
                onChange={(e) => setM({ ...m, guestName: e.target.value })}
                required
                disabled={!canWrite}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span>Pessoas</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="ex: 3"
                value={partyStr}
                onChange={(e) => setPartyStr(e.target.value)}
                disabled={!canWrite}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span>Check-in</span>
              <input
                type="date"
                value={m.checkIn}
                onChange={(e) => setM({ ...m, checkIn: e.target.value })}
                required
                disabled={!canWrite}
              />
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={m.breakfastIncluded}
                onChange={(e) => setM({ ...m, breakfastIncluded: e.target.checked })}
                disabled={!canWrite}
              />
              <span>Café da manhã</span>
            </label>

            <label className="flex flex-col gap-1">
              <span>Diária por pessoa (R$)</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="ex: 120"
                value={nightlyStr}
                onChange={(e) => setNightlyStr(e.target.value)}
                disabled={!canWrite || m.manualLodgingEnabled}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span>Café por pessoa/noite (R$)</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="ex: 10"
                value={breakfastStr}
                onChange={(e) => setBreakfastStr(e.target.value)}
                disabled={!canWrite}
              />
            </label>

            <label className="col-span-full flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!m.manualLodgingEnabled}
                onChange={(e) => setM({ ...m, manualLodgingEnabled: e.target.checked })}
                disabled={!canWrite}
              />
              <span>Informar valor total da hospedagem manualmente</span>
            </label>

            {m.manualLodgingEnabled && (
              <label className="flex flex-col gap-1">
                <span>Total da hospedagem (R$)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="ex: 340"
                  value={manualTotalStr}
                  onChange={(e) => setManualTotalStr(e.target.value)}
                  disabled={!canWrite}
                />
              </label>
            )}

            <label className="flex flex-col gap-1">
              <span>Telefone</span>
              <input
                value={m.phone || ''}
                onChange={(e) => setM({ ...m, phone: e.target.value })}
                disabled={!canWrite}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span>Email</span>
              <input
                type="email"
                value={m.email || ''}
                onChange={(e) => setM({ ...m, email: e.target.value })}
                disabled={!canWrite}
              />
            </label>

            <label className="col-span-full flex items-center gap-2">
              <input
                type="checkbox"
                checked={m.depositPaid}
                onChange={(e) => setM({ ...m, depositPaid: e.target.checked })}
                disabled={!canWrite}
              />
              <span>Depósito pago (50%)</span>
            </label>

            <label className="col-span-full flex flex-col gap-1">
              <span>Observações</span>
              <textarea
                rows={3}
                value={m.notes || ''}
                onChange={(e) => setM({ ...m, notes: e.target.value })}
                disabled={!canWrite}
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 p-3">
            <div>Noites: <strong>1</strong></div>
            <div>Total estimado: <strong>{formatBRL(computedTotal)}</strong></div>
            <div>Depósito (50%): <strong>{formatBRL(computedDeposit)}</strong></div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 border-t bg-white/90 backdrop-blur px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              {error ? (
                <span className="text-red-600">{error}</span>
              ) : !canWrite ? (
                <span className="text-amber-600">
                  Escritas restritas para esta conta (somente leitura).
                </span>
              ) : (
                <span className="opacity-0">placeholder</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={maybeClose}
                className="rounded border px-4 py-2 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>

              <button
                onClick={handleSave}
                disabled={saving || !canSave}
                title={!canWrite ? 'Somente leitura' : undefined}
                className="rounded bg-black px-4 py-2 text-white transition
                           hover:bg-black/90
                           disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando…' : (mode === 'create' ? 'Salvar' : 'Atualizar')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function snapshot(m: ReservationItem, drafts: { partyStr: string; nightlyStr: string; breakfastStr: string; manualTotalStr: string }) {
  return JSON.stringify({ m, drafts })
}

function intOrNaN(s: string): number {
  if (s.trim() === '') return NaN
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : NaN
}

function numOrNaN(s: string): number {
  if (s.trim() === '') return NaN
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
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