'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, X as CloseX } from 'lucide-react'

type ReservationItem = {
  id?: string
  guestName: string
  partySize: number
  checkIn: string
  checkOut: string
  phone?: string
  email?: string
  breakfastIncluded: boolean
  nightlyRate: number
  breakfastPerPersonPerNight: number
  depositPaid: boolean
  notes?: string
  totalPrice?: number
}

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
const BRL = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

export default function ReservationEditor({
  open,
  mode,
  initial,
  defaultDate,
  onClose,
  onSaved,
  onDirtyChange,
  onSwitchToView,
}: {
  open: boolean
  mode: 'create' | 'edit'
  initial?: ReservationItem
  defaultDate: string
  onClose: () => void
  onSaved: () => void
  onDirtyChange?: (dirty: boolean) => void
  onSwitchToView?: () => void
}) {
  // ---------- modelo base
  const [model, setModel] = useState<ReservationItem>(() => {
    const checkIn = initial?.checkIn ?? defaultDate
    return {
      id: initial?.id,
      guestName: initial?.guestName ?? '',
      partySize: initial?.partySize ?? 2,
      checkIn,
      checkOut: initial?.checkOut ?? addDaysISO(checkIn, 1),
      phone: initial?.phone ?? '',
      email: initial?.email ?? '',
      breakfastIncluded: initial?.breakfastIncluded ?? false,
      nightlyRate: initial?.nightlyRate ?? 100,
      breakfastPerPersonPerNight: initial?.breakfastPerPersonPerNight ?? 8,
      depositPaid: initial?.depositPaid ?? false,
      notes: initial?.notes ?? '',
      totalPrice: initial?.totalPrice,
    }
  })

  // Override manual da hospedagem (valor final da hospedagem do grupo, sem café)
  const [manualLodging, setManualLodging] = useState<boolean>(false)
  const [lodgingTotalManual, setLodgingTotalManual] = useState<number>(model.totalPrice ?? 0)

  // ---------- dirty tracking real
  const baselineRef = useRef<string>('')

  // gera um snapshot normalizado do que conta para "sujo"
  const snapshot = useMemo(
    () =>
      JSON.stringify({
        ...model,
        // normaliza campos opcionais
        phone: model.phone || '',
        email: model.email || '',
        notes: model.notes || '',
        // controla override manual
        manualLodging,
        lodgingTotalManual,
      }),
    [model, manualLodging, lodgingTotalManual]
  )

  // sempre que abre/entra em outro modo/inicial muda, redefine baseline e marca clean
  useEffect(() => {
    const checkIn = initial?.checkIn ?? defaultDate
    setModel(m => ({
      id: initial?.id,
      guestName: initial?.guestName ?? '',
      partySize: initial?.partySize ?? 2,
      checkIn,
      checkOut: initial?.checkOut ?? addDaysISO(checkIn, 1),
      phone: initial?.phone ?? '',
      email: initial?.email ?? '',
      breakfastIncluded: initial?.breakfastIncluded ?? false,
      nightlyRate: initial?.nightlyRate ?? 100,
      breakfastPerPersonPerNight: initial?.breakfastPerPersonPerNight ?? 8,
      depositPaid: initial?.depositPaid ?? false,
      notes: initial?.notes ?? '',
      totalPrice: initial?.totalPrice,
    }))
    setManualLodging(false)
    setLodgingTotalManual(initial?.totalPrice ?? 0)
    // baseline será definido no próximo efeito (abaixo) após model ser aplicado
    // mas já marcamos como clean:
    onDirtyChange?.(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initial, defaultDate])

  // quando o snapshot mudar, compara com baseline e informa dirty
  useEffect(() => {
    if (!baselineRef.current) {
      baselineRef.current = snapshot
      onDirtyChange?.(false)
      return
    }
    onDirtyChange?.(snapshot !== baselineRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot])

  const nights = 1
  const lodging = manualLodging ? lodgingTotalManual : nights * model.nightlyRate
  const breakfast = model.breakfastIncluded ? nights * model.partySize * model.breakfastPerPersonPerNight : 0
  const total = Math.round((lodging + breakfast) * 100) / 100
  const deposit = Math.round(total * 0.5 * 100) / 100

  function update<K extends keyof ReservationItem>(k: K, v: ReservationItem[K]) {
    setModel(prev => ({ ...prev, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const adminKey = localStorage.getItem('adminKey') || ''
    const checkOut = addDaysISO(model.checkIn, 1)
    const payload = {
      ...model,
      checkOut,
      nightlyRate: manualLodging ? lodgingTotalManual : model.nightlyRate,
    }
    const isEdit = mode === 'edit' && model.id
    const url = isEdit ? `/api/reservations/${model.id}` : '/api/reservations'
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      alert('Falha ao salvar')
      return
    }
    // após salvar, baseline = snapshot atual e dirty=false
    baselineRef.current = snapshot
    onDirtyChange?.(false)
    onSaved()
  }

  return (
    <form onSubmit={submit} className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{mode === 'edit' ? 'Editar reserva' : 'Nova reserva'}</h3>
        <div className="flex items-center gap-2">
          {mode === 'edit' && onSwitchToView && (
            <button type="button" className="btn-icon" title="Visualizar" onClick={onSwitchToView}>
              <Eye size={18} />
            </button>
          )}
          <button type="button" className="btn-ghost" title="Fechar" onClick={onClose}>
            <CloseX size={18} />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span>Nome do hóspede</span>
          <input value={model.guestName} onChange={e => update('guestName', e.target.value)} required />
        </label>

        <label className="flex flex-col gap-1">
          <span>Nº de pessoas</span>
          <input type="number" min={1} value={model.partySize} onChange={e => update('partySize', Number(e.target.value))} />
        </label>

        <label className="flex flex-col gap-1">
          <span>Check-in</span>
          <input
            type="date"
            value={model.checkIn}
            onChange={e => {
              const ci = e.target.value
              update('checkIn', ci)
              update('checkOut', addDaysISO(ci, 1))
            }}
          />
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={model.breakfastIncluded} onChange={e => update('breakfastIncluded', e.target.checked)} />
          <span>Café da manhã</span>
        </label>

        <label className="flex flex-col gap-1">
          <span>Diária por pessoa (R$)</span>
          <input type="number" step="0.01" disabled={manualLodging} value={model.nightlyRate} onChange={e => update('nightlyRate', Number(e.target.value))} />
        </label>

        <label className="flex flex-col gap-1">
          <span>Café R$/pessoa/noite</span>
          <input
            type="number"
            step="0.01"
            value={model.breakfastPerPersonPerNight}
            onChange={e => update('breakfastPerPersonPerNight', Number(e.target.value))}
          />
        </label>

        <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" checked={manualLodging} onChange={e => setManualLodging(e.target.checked)} />
          <span>Definir hospedagem manualmente</span>
        </label>

        {manualLodging && (
          <label className="flex flex-col gap-1 md:col-span-2">
            <span>Total de hospedagem (para o grupo, sem café)</span>
            <input type="number" step="0.01" value={lodgingTotalManual} onChange={e => setLodgingTotalManual(Number(e.target.value))} />
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span>Telefone</span>
          <input value={model.phone || ''} onChange={e => update('phone', e.target.value)} />
        </label>

        <label className="flex flex-col gap-1">
          <span>Email</span>
          <input type="email" value={model.email || ''} onChange={e => update('email', e.target.value)} />
        </label>

        <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" checked={model.depositPaid} onChange={e => update('depositPaid', e.target.checked)} />
          <span>Depósito pago (50%)</span>
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span>Observações</span>
          <textarea value={model.notes || ''} onChange={e => update('notes', e.target.value)} />
        </label>
      </div>

      <div className="mt-3 p-3 rounded-xl bg-gray-50">
        <div>Noites: <strong>1</strong></div>
        <div>Total: <strong>{BRL(total)}</strong></div>
        <div>Depósito: <strong>{BRL(deposit)}</strong></div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn">{mode === 'edit' ? 'Atualizar' : 'Salvar'}</button>
      </div>
    </form>
  )
}