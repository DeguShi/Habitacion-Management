'use client'

import { useEffect, useMemo, useState } from 'react'
import CalendarBoard from '@/app/components/CalendarBoard'
import ReservationEditor from '@/app/components/ReservationEditor'
import { Eye, Settings, X as CloseX, Plus, Trash2, Share2, Download } from 'lucide-react'

type ReservationItem = {
  id: string
  guestName: string
  partySize: number
  checkIn: string
  checkOut: string
  totalNights?: number
  totalPrice: number
  depositPaid: boolean
  phone?: string
  email?: string
  breakfastIncluded: boolean
  nightlyRate: number
  breakfastPerPersonPerNight: number
  manualLodgingEnabled?: boolean
  manualLodgingTotal?: number
  extraSpend?: number
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

function esDate(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

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
    if (!open) {return}
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) {return null}
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
  disabled = false,
  children,
}: {
  title: string
  onClick: () => void
  variant?: 'neutral' | 'danger'
  disabled?: boolean
  children: React.ReactNode
}) {
  const base = variant === 'danger' ? 'btn-danger' : 'btn-icon'
  return (
    <button
      type="button"
      className={`${base} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => {
        if (!disabled) onClick()
      }}
      title={title}
      aria-label={title}
      aria-disabled={disabled}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

type ClientShellProps = { canWrite?: boolean }

export default function ClientShell({ canWrite = false }: ClientShellProps) {
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

  async function loadMonth() {
    const res = await fetch(`/api/reservations?month=${month}`, { cache: 'no-store' })
    setItems(await res.json())
  }
  useEffect(() => {
    loadMonth()
  }, [month])

  const [upcoming, setUpcoming] = useState<ReservationItem[]>([])
  async function loadUpcoming() {
    const res = await fetch('/api/reservations', { cache: 'no-store' })
    const all: ReservationItem[] = await res.json()
    const today = todayISO()
    setUpcoming(all.filter(r => r.checkIn >= today).sort((a, b) => a.checkIn.localeCompare(b.checkIn)))
  }
  useEffect(() => {
    loadUpcoming()
  }, [])

  const dayItems = useMemo(() => items.filter(i => i.checkIn === selectedDate), [items, selectedDate])

  function confirmDiscardIfNeeded() {
    if (!editorOpen || !editorDirty) {return true}
    return confirm('Você tem alterações não salvas.\n\nDeseja descartá-las e continuar?')
  }

  function openView(item: ReservationItem) {
    if (!confirmDiscardIfNeeded()) {return}
    setEditorOpen(false)
    setEditorDirty(false)
    setEditing(null)
    setSelectedReservation(item)
    setViewOpen(true)
  }
  function openCreate() {
    if (!canWrite) {return}
    if (!confirmDiscardIfNeeded()) {return}
    setViewOpen(false)
    setSelectedReservation(null)
    setEditing(null)
    setEditorMode('create')
    setEditorOpen(true)
  }
  function openEdit(item: ReservationItem) {
    if (!canWrite) {return}
    if (!confirmDiscardIfNeeded()) {return}
    setViewOpen(false)
    setSelectedReservation(null)
    setEditing(item)
    setEditorMode('edit')
    setEditorOpen(true)
  }

  async function remove(item: ReservationItem) {
    if (!canWrite) {return}
    const ok = confirm(
      `Excluir a reserva de ${item.guestName} em ${formatBR(item.checkIn)}?\n\nEsta ação é permanente e não pode ser desfeita.`
    )
    if (!ok) {return}

    const res = await fetch(`/api/reservations/${item.id}`, { method: 'DELETE' })

    if (res.status === 403) {
      alert('Sua conta não tem permissão para alterar dados.')
      return
    }
    if (!res.ok) {
      alert('Falha ao excluir')
      return
    }

    if (selectedReservation?.id === item.id) {
      setSelectedReservation(null)
      setViewOpen(false)
    }
    await Promise.all([loadMonth(), loadUpcoming()])
  }

  const clicky = (fn: () => void) => ({
    role: 'button' as const,
    tabIndex: 0,
    onClick: fn,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {fn()}
    },
    className: 'text-left cursor-pointer focus:outline-none',
  })

  // --- Share/Save confirmation card ---

  async function loadLogo(): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = '/logo-hab.png'
    })
  }

  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function renderConfirmationPNG(r: ReservationItem): Promise<Blob> {
    const width = 1080
    const height = 1500

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    // Background (soft vertical gradient)
    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, '#f9fafb')
    bg.addColorStop(1, '#eef7f0')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // Card
    const pad = 48
    const cardX = pad
    const cardY = pad
    const cardW = width - pad * 2
    const cardH = height - pad * 2

    ctx.fillStyle = '#fff'
    roundRect(ctx, cardX, cardY, cardW, cardH, 36)
    ctx.fill()
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.08)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Floral-ish ornaments (like the sign-in page), behind text
    ctx.save()
    ctx.beginPath()
    roundRect(ctx, cardX, cardY, cardW, cardH, 36)
    ctx.clip()

    // pastel dots
    function dot(x: number, y: number, r: number, color: string, alpha = 1) {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.restore()
    }
    dot(cardX + 90, cardY + 85, 36, '#FFF7D6', 1)
    dot(cardX + 170, cardY + 58, 16, '#FFE8A3', 0.95)
    dot(cardX + cardW - 90, cardY + 90, 20, '#FFE8A3', 0.8)
    dot(cardX + 72, cardY + cardH - 90, 40, '#FFF7D6', 1)
    dot(cardX + cardW - 70, cardY + cardH - 70, 34, '#FFF1C0', 0.9)

    // green swooshes
    function swoosh(points: [number, number][], alpha = 0.55, width = 14) {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.lineWidth = width
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#C7F2D7'
      ctx.beginPath()
      ctx.moveTo(points[0][0], points[0][1])
      for (let i = 1; i < points.length; i++) {
        const [x, y] = points[i]
        ctx.quadraticCurveTo(points[i - 1][0], points[i - 1][1], x, y)
      }
      ctx.stroke()
      ctx.restore()
    }
    // top-right arc
    swoosh(
      [
        [cardX + cardW - 220, cardY + 40],
        [cardX + cardW - 60, cardY + 160],
        [cardX + cardW - 140, cardY + 260],
      ],
      0.5,
      16
    )
    // bottom-left arc
    swoosh(
      [
        [cardX + 60, cardY + cardH - 220],
        [cardX + 190, cardY + cardH - 60],
        [cardX + 300, cardY + cardH - 120],
      ],
      0.5,
      16
    )
    ctx.restore()

    // Logo (top, centered)
    const logo = await loadLogo()
    const topLogoW = 360
    const topLogoH = (logo.height / logo.width) * topLogoW
    const topLogoX = cardX + (cardW - topLogoW) / 2
    const topLogoY = cardY + 64
    ctx.drawImage(logo, topLogoX, topLogoY, topLogoW, topLogoH)

    // Title
    ctx.fillStyle = '#0f172a'
    ctx.font = '700 56px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
    ctx.textAlign = 'center'
    ctx.fillText('Confirmación de Reserva', cardX + cardW / 2, topLogoY + topLogoH + 68)

    // Two columns (narrower, closer to center)
    const leftX = cardX + 160
    const rightX = cardX + cardW - 160
    let y = topLogoY + topLogoH + 150
    const lh = 64

    function row(label: string, value: string) {
      ctx.font = '600 30px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
      ctx.fillStyle = '#334155'
      ctx.textAlign = 'left'
      ctx.fillText(label, leftX, y)

      ctx.font = '700 34px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
      ctx.fillStyle = '#0f172a'
      ctx.textAlign = 'right'
      ctx.fillText(value, rightX, y)
      y += lh
    }

    row('Cliente', r.guestName)
    row('Personas', String(r.partySize))
    row('Check-in', formatBR(r.checkIn))
    row('Check-out', formatBR(r.checkOut))
    row('Desayuno', r.breakfastIncluded ? 'Sí' : 'No')
    row('Depósito (50%)', r.depositPaid ? 'Pagado' : 'Pendiente')

    // Total
    y += 8
    ctx.font = '800 52px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
    ctx.fillStyle = '#0f172a'
    ctx.textAlign = 'left'
    ctx.fillText('Total', leftX, y)
    ctx.textAlign = 'right'
    ctx.fillText(BRL(r.totalPrice), rightX, y)

    // Footer
    ctx.font = '500 24px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
    ctx.fillStyle = '#64748b'
    ctx.textAlign = 'center'
    ctx.fillText('Habitación Familiar • Confirmación para el huésped', cardX + cardW / 2, cardY + cardH - 32)

    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png', 0.95)
    )
  }

  async function shareReservation(r: ReservationItem) {
    const blob = await renderConfirmationPNG(r)
    const file = new File([blob], `confirmacion-${r.guestName.replace(/\s+/g, '_')}.png`, {
      type: 'image/png',
    })

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Confirmación de Reserva',
          files: [file],
          text: `Confirmación de ${r.guestName}`,
        })
        return
      } catch {
        // fall through to download
      }
    }
    //downloadBlob(file.name, blob)
  }

  async function saveReservationCard(r: ReservationItem) {
    const blob = await renderConfirmationPNG(r)
    downloadBlob(`confirmacion-${r.guestName.replace(/\s+/g, '_')}.png`, blob)
  }

  return (
    <main className="max-w-5xl mx-auto p-6 grid md:grid-cols-5 gap-6">
      {/* Calendar */}
      <section className="md:col-span-2 card">
        <div className="calendar-board">
          <CalendarBoard
            month={month}
            onMonthChange={m => {
              setMonth(m)
              setSelectedReservation(null)
              setViewOpen(false)
            }}
            selectedDate={selectedDate}
            onSelectDate={d => {
              setSelectedDate(d)
              setSelectedReservation(null)
              setViewOpen(false)
            }}
            items={items}
            roomsTotal={3}
          />
        </div>
      </section>

      {/* Day list */}
      <section className="md:col-span-3 card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{formatBR(selectedDate)}</h2>
          <IconButton title={canWrite ? 'Nova reserva' : 'Somente leitura'} onClick={openCreate} disabled={!canWrite}>
            <Plus size={18} />
          </IconButton>
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
                  <IconButton title="Ver" onClick={() => openView(i)}>
                    <Eye size={18} />
                  </IconButton>
                  <IconButton title={canWrite ? 'Editar' : 'Somente leitura'} onClick={() => openEdit(i)} disabled={!canWrite}>
                    <Settings size={18} />
                  </IconButton>
                  <IconButton title={canWrite ? 'Excluir' : 'Somente leitura'} variant="danger" onClick={() => remove(i)} disabled={!canWrite}>
                    <Trash2 size={18} />
                  </IconButton>
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
              <div
                {...clicky(() => {
                  setMonth(i.checkIn.slice(0, 7))
                  setSelectedDate(i.checkIn)
                  openView(i)
                })}
              >
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
                  <IconButton
                    title="Ver"
                    onClick={() => {
                      setMonth(i.checkIn.slice(0, 7))
                      setSelectedDate(i.checkIn)
                      openView(i)
                    }}
                  >
                    <Eye size={18} />
                  </IconButton>
                  <IconButton
                    title={canWrite ? 'Editar' : 'Somente leitura'}
                    onClick={() => {
                      setMonth(i.checkIn.slice(0, 7))
                      setSelectedDate(i.checkIn)
                      openEdit(i)
                    }}
                    disabled={!canWrite}
                  >
                    <Settings size={18} />
                  </IconButton>
                  <IconButton title={canWrite ? 'Excluir' : 'Somente leitura'} variant="danger" onClick={() => remove(i)} disabled={!canWrite}>
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
                {/* Edit kept disabled for now */}
                {/* <IconButton title={canWrite ? 'Editar' : 'Somente leitura'} onClick={() => openEdit(selectedReservation)} disabled={!canWrite}>
                  <Settings size={18} />
                </IconButton> */}
                <IconButton title="Compartilhar confirmação" onClick={() => shareReservation(selectedReservation)}>
                  <Share2 size={18} />
                </IconButton>
                <IconButton title="Guardar imagem" onClick={() => saveReservationCard(selectedReservation)}>
                  <Download size={18} />
                </IconButton>
                <IconButton title="Fechar" onClick={() => setViewOpen(false)}>
                  <CloseX size={18} />
                </IconButton>
              </div>
            </div>

            {(() => {
              const r = selectedReservation
              const nights = r.totalNights ?? 1
              const lodging =
                r.manualLodgingEnabled && r.manualLodgingTotal != null
                  ? r.manualLodgingTotal
                  : nights * r.nightlyRate * r.partySize
              const breakfast = r.breakfastIncluded ? nights * r.partySize * r.breakfastPerPersonPerNight : 0
              const extra = r.extraSpend ?? 0
              const total = (lodging || 0) + (breakfast || 0) + (extra || 0)

              return (
                <dl className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Hóspede</dt>
                    <dd className="font-medium">{r.guestName}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Pessoas</dt>
                    <dd className="font-medium">{r.partySize}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Check-in</dt>
                    <dd className="font-medium">{formatBR(r.checkIn)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Check-out</dt>
                    <dd className="font-medium">{formatBR(r.checkOut)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Café da manhã</dt>
                    <dd className="font-medium">{r.breakfastIncluded ? 'Sim' : 'Não'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Contato</dt>
                    <dd className="font-medium">{r.phone || r.email || '-'}</dd>
                  </div>

                  <div className="md:col-span-2 rounded-lg bg-gray-50 p-3">
                    <div className="font-medium mb-1">Valor</div>
                    <div className="grid grid-cols-2 gap-y-1">
                      <div>Diária</div>
                      <div className="text-right">{BRL(lodging || 0)}</div>
                      {breakfast > 0 && (
                        <>
                          <div>Café</div>
                          <div className="text-right">{BRL(breakfast)}</div>
                        </>
                      )}
                      <div>Consumo extra</div>
                      <div className="text-right">{BRL(extra || 0)}</div>
                      <div className="col-span-2 border-t my-1" />
                      <div>Total</div>
                      <div className="text-right font-semibold">{BRL(total)}</div>
                    </div>
                  </div>

                  <div>
                    <dt className="text-gray-500">Depósito</dt>
                    <dd className="font-medium">{r.depositPaid ? 'Pago' : 'Pendente'}</dd>
                  </div>

                  {r.notes && (
                    <div className="md:col-span-2">
                      <dt className="text-gray-500">Observações</dt>
                      <dd className="font-medium whitespace-pre-wrap">{r.notes}</dd>
                    </div>
                  )}
                </dl>
              )
            })()}
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
          onClose={() => {
            setEditorOpen(false)
            setEditorDirty(false)
          }}
          onSaved={() => {
            setEditorOpen(false)
            setEditorDirty(false)
            loadMonth()
            loadUpcoming()
          }}
          onDirtyChange={setEditorDirty}
          onSwitchToView={() => {
            if (!editing) {return}
            if (!confirmDiscardIfNeeded()) {return}
            openView(editing)
          }}
          canWrite={canWrite}
        />
      </Modal>
    </main>
  )
}

// drawing helper
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}