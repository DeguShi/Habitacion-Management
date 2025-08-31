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
  // string drafts so fields can be blank on mobile/desktop
  const [guestName, setGuestName] = useState('')
  const [partyStr, setPartyStr] = useState('')             // Pessoas
  const [checkIn, setCheckIn] = useState(defaultDate || '')
  const [breakfastIncluded, setBreakfastIncluded] = useState(false)
  const [nightlyStr, setNightlyStr] = useState('')         // Diária por pessoa
  const [breakfastStr, setBreakfastStr] = useState('')     // Café por pessoa/noite
  const [depositPaid, setDepositPaid] = useState(false)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  const nights = 1
  const party = intOrNaN(partyStr)
  const nightly = numOrNaN(nightlyStr)
  const breakfast = numOrNaN(breakfastStr)

  const total = useMemo(() => {
    const lodging = nights * (isNaN(nightly) ? 0 : nightly) * (isNaN(party) ? 0 : party)
    const coffee = breakfastIncluded ? nights * (isNaN(party) ? 0 : party) * (isNaN(breakfast) ? 0 : breakfast) : 0
    return Math.round((lodging + coffee) * 100) / 100
  }, [nights, nightly, party, breakfastIncluded, breakfast])

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!guestName || !guestName.trim()) {
      alert('Informe o nome do hóspede'); 
      return;
    }
    if (!checkIn) {
      alert('Selecione a data de check-in');
      return;
    }

    const p = intOrNaN(partyStr);
    const n = numOrNaN(nightlyStr);
    const b = numOrNaN(breakfastStr);

    if (isNaN(p) || p < 1) {
      alert('Informe o nº de pessoas');
      return;
    }
    if (isNaN(n) || n < 0) {
      alert('Informe a diária por pessoa');
      return;
    }
    if (breakfastIncluded && (isNaN(b) || b < 0)) {
      alert('Informe o valor do café');
      return;
    }

    const payload = {
      guestName: guestName.trim(),
      partySize: p,
      checkIn,
      checkOut: addDaysISO(checkIn, 1),
      breakfastIncluded,
      nightlyRate: isNaN(n) ? 0 : n,
      breakfastPerPersonPerNight: isNaN(b) ? 0 : b,
      depositPaid,
      phone,
      email,
      notes,
    };

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      try {
        const j = await res.json();
        alert(`Falha ao salvar${j?.error ? `: ${j.error}` : ''}`);
      } catch {
        alert('Falha ao salvar');
      }
      return;
    }

    onSaved();
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
          <label>Nome do hóspede
            <input value={guestName} onChange={e => setGuestName(e.target.value)} required placeholder="ex: Família Silva" />
          </label>

          <label>Nº de pessoas
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="ex: 4"
              value={partyStr}
              onChange={e => setPartyStr(e.target.value)}
            />
          </label>

          <label>Check-in
            <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} required />
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={breakfastIncluded} onChange={e => setBreakfastIncluded(e.target.checked)} />
            <span>Café da manhã</span>
          </label>

          <label>Diária por pessoa (R$)
            <input
              type="text"
              inputMode="decimal"
              placeholder="ex: 120"
              value={nightlyStr}
              onChange={e => setNightlyStr(e.target.value)}
            />
          </label>

          <label>Café R$/pessoa/noite
            <input
              type="text"
              inputMode="decimal"
              placeholder="ex: 8"
              value={breakfastStr}
              onChange={e => setBreakfastStr(e.target.value)}
            />
          </label>

          <label>Telefone
            <input value={phone} onChange={e => setPhone(e.target.value)} />
          </label>

          <label>Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={depositPaid} onChange={e => setDepositPaid(e.target.checked)} />
            <span>Depósito pago (50%)</span>
          </label>

          <label className="md:col-span-2">Observações
            <textarea value={notes} onChange={e => setNotes(e.target.value)} />
          </label>

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