'use client'
import { useMemo, useState } from 'react'

type Props = { open: boolean; onClose: () => void; onSaved: () => void; defaultDate?: string }

function addDaysISO(dateISO: string, days: number) {
  const [y,m,d] = dateISO.split('-').map(Number)
  const dt = new Date(y, m-1, d + days)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth()+1).padStart(2,'0')
  const dd = String(dt.getDate()).padStart(2,'0')
  return `${yy}-${mm}-${dd}`
}

export default function AddReservationModal({ open, onClose, onSaved, defaultDate }: Props) {
  const [model, setModel] = useState({
    guestName: '', partySize: 2, checkIn: defaultDate || '',
    breakfastIncluded: false, nightlyRate: 100, breakfastPerPersonPerNight: 8,
    depositPaid: false, phone: '', email: '', notes: ''
  })

  // single night
  const nights = 1
  const total = useMemo(() => {
    const lodging = nights * model.nightlyRate
    const breakfast = model.breakfastIncluded ? nights * model.partySize * model.breakfastPerPersonPerNight : 0
    return Math.round((lodging + breakfast) * 100) / 100
  }, [model])

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!model.checkIn) { alert('Selecione a data de check-in'); return }
    const payload = { ...model, checkOut: addDaysISO(model.checkIn, 1) } // compute next morning
    const res = await fetch('/api/reservations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
    if (!res.ok) { alert('Falha ao salvar'); return }
    onSaved()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/30 p-4" onMouseDown={onClose}>
      <div className="card w-full max-w-2xl bg-white" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Nova reserva</h3>
          <button className="bg-gray-100 text-gray-700" onClick={onClose}>Fechar</button>
        </div>

        <form onSubmit={save} className="grid md:grid-cols-2 gap-3">
          <label>Nome do hóspede<input value={model.guestName} onChange={e => setModel({ ...model, guestName: e.target.value })} required /></label>
          <label>Nº de pessoas<input type="number" min={1} value={model.partySize} onChange={e => setModel({ ...model, partySize: Number(e.target.value) })} /></label>
          <label>Check-in<input type="date" value={model.checkIn} onChange={e => setModel({ ...model, checkIn: e.target.value })} required /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={model.breakfastIncluded} onChange={e => setModel({ ...model, breakfastIncluded: e.target.checked })} /><span>Café da manhã</span></label>
          <label>Diária (R$)<input type="number" value={model.nightlyRate} onChange={e => setModel({ ...model, nightlyRate: Number(e.target.value) })} /></label>
          <label>Café R$/pessoa/noite<input type="number" value={model.breakfastPerPersonPerNight} onChange={e => setModel({ ...model, breakfastPerPersonPerNight: Number(e.target.value) })} /></label>
          <label>Telefone<input value={model.phone} onChange={e => setModel({ ...model, phone: e.target.value })} /></label>
          <label>Email<input type="email" value={model.email} onChange={e => setModel({ ...model, email: e.target.value })} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={model.depositPaid} onChange={e => setModel({ ...model, depositPaid: e.target.checked })} /><span>Depósito pago (50%)</span></label>
          <label className="md:col-span-2">Observações<textarea value={model.notes} onChange={e => setModel({ ...model, notes: e.target.value })} /></label>

          <div className="md:col-span-2 grid grid-cols-3 gap-2 bg-gray-50 rounded-lg p-3 text-sm">
            <div>Noites: <strong>1</strong></div>
            <div>Total: <strong>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(total)}</strong></div>
            <div>Depósito: <strong>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(total*0.5)}</strong></div>
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" className="bg-gray-100 text-gray-700" onClick={onClose}>Cancelar</button>
            <button type="submit">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}