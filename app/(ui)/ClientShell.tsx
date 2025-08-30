'use client'

import { useEffect, useMemo, useState } from 'react'
import CalendarBoard from '@/app/components/CalendarBoard'
import ReservationEditor from '@/app/components/ReservationEditor'
import { Eye, Settings, X as CloseX, Plus, Trash2 } from 'lucide-react'

type ReservationItem = {
  id: string
  guestName: string
  partySize: number
  checkIn: string
  checkOut: string
  totalPrice: number
  depositPaid: boolean
  phone?: string
  email?: string
  breakfastIncluded: boolean
  nightlyRate: number
  breakfastPerPersonPerNight: number
  notes?: string
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}
function monthOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function formatBR(iso: string) {
  const [y, m, day] = iso.split('-')
  return `${day}/${m}/${y}`
}
const BRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

function Modal({
  open,
  onClose,
  children,
  maxW = 'max-w-3xl',
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  maxW?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative z-10 w-full ${maxW}`}>
        <div className="rounded-2xl bg-white shadow-xl">{children}</div>
      </div>
    </div>
  )
}

function IconButton({
  title,
  onClick,
  variant = 'neutral',
  children,
}: {
  title: string
  onClick: () => void
  variant?: 'neutral' | 'danger'
  children: React.ReactNode
}) {
  return (
    <button
      className={variant === 'danger' ? 'btn-danger' : 'btn-icon'}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  )
}

export default function ClientShell() {
  const [month, setMonth] = useState<string>(monthOf(new Date()))
  const [items, setItems] = useState<ReservationItem[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(todayISO())

  // view
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<ReservationItem | null>(null)

  // editor
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<ReservationItem | null>(null)
  const [editorDirty, setEditorDirty] = useState(false)

  const adminHeaders = () => ({
    'x-admin-key': typeof window !== 'undefined' ? localStorage.getItem('adminKey') || '' : '',
  })

  async function loadMonth() {
    const res = await fetch(`/api/reservations?month=${month}`)
    setItems(await res.json())
  }
  useEffect(() => {
    loadMonth()
  }, [month])

  // upcoming (for bottom list)
  const [upcoming, setUpcoming] = useState<ReservationItem[]>([])
  async function loadUpcoming() {
    const res = await fetch('/api/reservations')
    const all: ReservationItem[] = await res.json()
    const today = todayISO()
    setUpcoming(all.filter(r => r.checkIn >= today).sort((a, b) => a.checkIn.localeCompare(b.checkIn)))
  }
  useEffect(() => {
    loadUpcoming()
  }, [])

  const dayItems = useMemo(
    () => items.filter(i => i.checkIn === selectedDate),
    [items, selectedDate]
  )

  function confirmDiscardIfNeeded() {
    if (!editorOpen || !editorDirty) return true
    return confirm('Você tem alterações não salvas.\n\nDeseja descartá-las e continuar?')
  }

  function openView(item: ReservationItem) {
    if (!confirmDiscardIfNeeded()) return
    setEditorOpen(false)
    setEditorDirty(false)
    setEditing(null)
    setSelectedReservation(item)
    setViewOpen(true)
  }
  function openCreate() {
    if (!confirmDiscardIfNeeded()) return
    setViewOpen(false)
    setSelectedReservation(null)
    setEditing(null)
    setEditorMode('create')
    setEditorOpen(true)
  }
  function openEdit(item: ReservationItem) {
    if (!confirmDiscardIfNeeded()) return
    setViewOpen(false)
    setSelectedReservation(null)
    setEditing(item)
    setEditorMode('edit')
    setEditorOpen(true)
  }

  async function remove(item: ReservationItem) {
    const ok = confirm(
      `Excluir a reserva de ${item.guestName} em ${formatBR(item.checkIn)}?\n\nEsta ação é permanente e não pode ser desfeita.`
    )
    if (!ok) return
    const res = await fetch(`/api/reservations/${item.id}`, { method: 'DELETE', headers: adminHeaders() })
    if (!res.ok) { alert('Falha ao excluir'); return }
    if (selectedReservation?.id === item.id) { setSelectedReservation(null); setViewOpen(false) }
    await Promise.all([loadMonth(), loadUpcoming()])
  }

  const clicky = (fn: () => void) => ({
    role: 'button' as const,
    tabIndex: 0,
    onClick: fn,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') fn() },
    className: 'text-left cursor-pointer focus:outline-none',
  })

  return (
    <main className="max-w-5xl mx-auto p-6 grid md:grid-cols-5 gap-6">
      {/* Calendar */}
      <section className="md:col-span-2 card">
        <div className="calendar-board">
          <CalendarBoard
            month={month}
            onMonthChange={m => { setMonth(m); setSelectedReservation(null); setViewOpen(false) }}
            selectedDate={selectedDate}
            onSelectDate={d => { setSelectedDate(d); setSelectedReservation(null); setViewOpen(false) }}
            items={items}
            roomsTotal={3}
          />
        </div>
      </section>

      {/* Day list */}
      <section className="md:col-span-3 card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{formatBR(selectedDate)}</h2>
          <IconButton title="Nova reserva" onClick={openCreate}><Plus size={18} /></IconButton>
        </div>

        <div className={`space-y-2 ${dayItems.length > 4 ? 'max-h-96 overflow-y-auto scroll-soft' : ''}`}>
          {dayItems.length === 0 && <p className="text-sm text-gray-600">Sem reservas para este dia.</p>}

          {dayItems.map(i => (
            <div key={i.id} className="flex items-center justify-between p-3 rounded-xl bg-white shadow-sm lift">
              <div {...clicky(() => openView(i))} title="Ver detalhes">
                <div className="font-medium text-gray-900">
                  {i.guestName} <span className="text-gray-500">({i.partySize})</span>
                </div>
                <div className="text-xs text-gray-500">Check-in {i.checkIn} • Check-out {i.checkOut}</div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm">{BRL(i.totalPrice)}</div>
                  <div className="text-xs text-gray-500">{i.depositPaid ? 'Depósito pago' : 'Depósito pendente'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <IconButton title="Ver" onClick={() => openView(i)}><Eye size={18} /></IconButton>
                  <IconButton title="Editar" onClick={() => openEdit(i)}><Settings size={18} /></IconButton>
                  <IconButton title="Excluir" variant="danger" onClick={() => remove(i)}><Trash2 size={18} /></IconButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming */}
      <section className="md:col-span-5 card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Próximas reservas</h2>
        </div>
        <div className={`${upcoming.length > 5 ? 'max-h-96 overflow-y-auto scroll-soft' : ''} space-y-2`}>
          {upcoming.map(i => (
            <div key={i.id} className="py-3 px-3 flex items-center justify-between rounded-xl bg-white shadow-sm lift">
              <div {...clicky(() => { setMonth(i.checkIn.slice(0,7)); setSelectedDate(i.checkIn); openView(i) })}>
                <div className="font-medium">
                  {formatBR(i.checkIn)} — {i.guestName} <span className="text-gray-500">({i.partySize})</span>
                </div>
                <div className="text-xs text-gray-500">Checkout {formatBR(i.checkOut)}</div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm">{BRL(i.totalPrice)}</div>
                  <div className="text-xs text-gray-500">{i.depositPaid ? 'Depósito pago' : 'Depósito pendente'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <IconButton title="Ver" onClick={() => { setMonth(i.checkIn.slice(0,7)); setSelectedDate(i.checkIn); openView(i) }}>
                    <Eye size={18} />
                  </IconButton>
                  <IconButton title="Editar" onClick={() => { setMonth(i.checkIn.slice(0,7)); setSelectedDate(i.checkIn); openEdit(i) }}>
                    <Settings size={18} />
                  </IconButton>
                  <IconButton title="Excluir" variant="danger" onClick={() => remove(i)}>
                    <Trash2 size={18} />
                  </IconButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* VIEW MODAL */}
      <Modal open={viewOpen} onClose={() => setViewOpen(false)}>
        {selectedReservation && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Detalhes da reserva</h3>
              <div className="flex items-center gap-2">
                <IconButton
                  title="Editar"
                  onClick={() => openEdit(selectedReservation)}
                >
                  <Settings size={18} />
                </IconButton>
                <IconButton title="Fechar" onClick={() => setViewOpen(false)}>
                  <CloseX size={18} />
                </IconButton>
              </div>
            </div>
            <dl className="grid md:grid-cols-2 gap-3 text-sm">
              <div><dt className="text-gray-500">Hóspede</dt><dd className="font-medium">{selectedReservation.guestName}</dd></div>
              <div><dt className="text-gray-500">Pessoas</dt><dd className="font-medium">{selectedReservation.partySize}</dd></div>
              <div><dt className="text-gray-500">Check-in</dt><dd className="font-medium">{formatBR(selectedReservation.checkIn)}</dd></div>
              <div><dt className="text-gray-500">Check-out</dt><dd className="font-medium">{formatBR(selectedReservation.checkOut)}</dd></div>
              <div><dt className="text-gray-500">Café da manhã</dt><dd className="font-medium">{selectedReservation.breakfastIncluded ? 'Sim' : 'Não'}</dd></div>
              <div><dt className="text-gray-500">Contato</dt><dd className="font-medium">{selectedReservation.phone || selectedReservation.email || '-'}</dd></div>
              <div><dt className="text-gray-500">Valor</dt><dd className="font-medium">{BRL(selectedReservation.totalPrice)}</dd></div>
              <div><dt className="text-gray-500">Depósito</dt><dd className="font-medium">{selectedReservation.depositPaid ? 'Pago' : 'Pendente'}</dd></div>
              {selectedReservation.notes && (
                <div className="md:col-span-2">
                  <dt className="text-gray-500">Observações</dt>
                  <dd className="font-medium whitespace-pre-wrap">{selectedReservation.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </Modal>

      {/* EDITOR MODAL */}
      <Modal open={editorOpen} onClose={() => setEditorOpen(false)}>
        <ReservationEditor
          open={true}
          mode={editorMode}
          initial={editing ?? undefined}
          defaultDate={selectedDate}
          onClose={() => { setEditorOpen(false); setEditorDirty(false) }}
          onSaved={() => { setEditorOpen(false); setEditorDirty(false); loadMonth(); loadUpcoming() }}
          onDirtyChange={setEditorDirty}
          onSwitchToView={() => {
            if (!editing) return
            if (!confirmDiscardIfNeeded()) return
            openView(editing)
          }}
        />
      </Modal>
    </main>
  )
}