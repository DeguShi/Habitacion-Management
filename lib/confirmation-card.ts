/**
 * Confirmation Card Generator v2
 * 
 * Generates a professional PNG image for reservation confirmation cards.
 * Vertical 1080×1500 layout with HiDPI support.
 */

import type { ReservationV2, Payment } from '@/core/entities_v2'

// ============================================================
// Formatting Helpers
// ============================================================

/**
 * Formats a date from YYYY-MM-DD to DD/MM/YYYY
 */
export function formatDateBR(iso: string): string {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
}

/**
 * Formats a number as Brazilian currency (R$ X.XXX,XX)
 */
export function formatMoneyBRL(value: number | undefined | null): string {
    if (value == null || isNaN(value)) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value)
}

/**
 * Wraps text to fit within a maximum width, returning lines
 */
export function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const metrics = ctx.measureText(testLine)

        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine)
            currentLine = word
        } else {
            currentLine = testLine
        }
    }

    if (currentLine) {
        lines.push(currentLine)
    }

    return lines
}

/**
 * Gets status label in Portuguese
 */
export function getStatusLabel(status?: string): string {
    switch (status) {
        case 'confirmed': return 'Confirmada'
        case 'waiting': return 'Em Espera'
        case 'rejected': return 'Cancelada'
        default: return 'Confirmada' // Legacy v1 records
    }
}

/**
 * Gets status color
 */
export function getStatusColor(status?: string): string {
    switch (status) {
        case 'confirmed': return '#16a34a' // green-600
        case 'waiting': return '#ca8a04' // yellow-600
        case 'rejected': return '#dc2626' // red-600
        default: return '#16a34a'
    }
}

/**
 * Gets deposit status label
 */
export function getDepositLabel(payment?: Payment): string {
    // Check if deposit marked as paid
    if (payment?.deposit?.paid) {
        const amount = payment.deposit.due
        return amount ? `Pago (${formatMoneyBRL(amount)})` : 'Pago'
    }
    // Check if any payment events exist
    const totalPaid = payment?.events?.reduce((s, e) => s + (e.amount || 0), 0) || 0
    if (totalPaid > 0) return `Pago (${formatMoneyBRL(totalPaid)})`
    return 'Pendente'
}

// ============================================================
// Card Generation
// ============================================================

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1500
const CARD_PADDING = 80
const CONTENT_WIDTH = CARD_WIDTH - (CARD_PADDING * 2)

/**
 * Clamps devicePixelRatio for HiDPI rendering
 * Cap at 2 to prevent huge file sizes on 3x+ displays
 */
export function clampDevicePixelRatio(): number {
    if (typeof window === 'undefined') return 1
    return Math.min(Math.max(window.devicePixelRatio || 1, 1), 2)
}

/**
 * Loads an image with timeout fallback
 */
async function loadImage(src: string, timeoutMs = 2000): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const img = new Image()
        const timeout = setTimeout(() => resolve(null), timeoutMs)

        img.onload = () => {
            clearTimeout(timeout)
            resolve(img)
        }
        img.onerror = () => {
            clearTimeout(timeout)
            resolve(null)
        }
        img.src = src
    })
}

/**
 * Draws a rounded rectangle
 */
function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    r: number
) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
}

/**
 * Renders a confirmation card as PNG Blob
 * Professional vertical layout 1080×1500 with HiDPI
 */
export async function renderConfirmationCard(record: ReservationV2): Promise<Blob> {
    // Wait for fonts to load (browser only)
    if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready
    }

    // Calculate derived values
    const nights = (() => {
        if (!record.checkIn || !record.checkOut) return 1
        const d1 = new Date(record.checkIn + 'T00:00:00')
        const d2 = new Date(record.checkOut + 'T00:00:00')
        return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
    })()

    // HiDPI scale factor
    const scale = clampDevicePixelRatio()

    // Create canvas with HiDPI support
    const canvas = document.createElement('canvas')
    canvas.width = CARD_WIDTH * scale
    canvas.height = CARD_HEIGHT * scale

    const ctx = canvas.getContext('2d')!

    // Scale context for HiDPI
    ctx.scale(scale, scale)

    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true
    if ('imageSmoothingQuality' in ctx) {
        (ctx as any).imageSmoothingQuality = 'high'
    }

    // ============================================================
    // Background
    // ============================================================
    ctx.fillStyle = '#fafafa'
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

    // Accent bar at top
    ctx.fillStyle = getStatusColor(record.status)
    ctx.fillRect(0, 0, CARD_WIDTH, 12)

    let y = 60

    // ============================================================
    // Logo (optional)
    // ============================================================
    const logo = await loadImage('/logo-hab.png', 2000)
    if (logo) {
        const logoHeight = 50
        const logoWidth = logoHeight * (logo.width / logo.height)
        ctx.drawImage(logo, CARD_PADDING, y, logoWidth, logoHeight)
        y += logoHeight + 30
    } else {
        y += 30
    }

    // ============================================================
    // Title: "Confirmação de Reserva"
    // ============================================================
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif'
    ctx.fillText('Confirmação de Reserva', CARD_PADDING, y + 48)
    y += 80

    // ============================================================
    // Status badge
    // ============================================================
    const statusLabel = getStatusLabel(record.status)
    ctx.font = 'bold 24px system-ui, sans-serif'
    const badgeWidth = ctx.measureText(statusLabel).width + 40

    roundRect(ctx, CARD_PADDING, y, badgeWidth, 44, 22)
    ctx.fillStyle = getStatusColor(record.status)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.fillText(statusLabel, CARD_PADDING + 20, y + 30)
    y += 80

    // ============================================================
    // Guest name (large)
    // ============================================================
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif'
    const nameLines = wrapText(ctx, record.guestName || 'Hóspede', CONTENT_WIDTH)
    for (const line of nameLines.slice(0, 2)) {
        ctx.fillText(line, CARD_PADDING, y + 56)
        y += 70
    }
    y += 30

    // ============================================================
    // Divider
    // ============================================================
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(CARD_PADDING, y)
    ctx.lineTo(CARD_WIDTH - CARD_PADDING, y)
    ctx.stroke()
    y += 40

    // ============================================================
    // Data grid (two columns)
    // ============================================================
    const dataItems = [
        { label: 'Check-in', value: formatDateBR(record.checkIn) },
        { label: 'Check-out', value: formatDateBR(record.checkOut) },
        { label: 'Noites', value: String(nights) },
        { label: 'Hóspedes', value: String(record.partySize || 1) },
        { label: 'Quartos', value: String(record.rooms ?? 1) },
        { label: 'Café da manhã', value: record.breakfastIncluded ? 'Sim' : 'Não' },
        { label: 'Depósito', value: getDepositLabel(record.payment) },
    ]

    const labelCol = CARD_PADDING
    const valueCol = CARD_PADDING + 320
    const rowHeight = 55

    for (const item of dataItems) {
        // Label (gray)
        ctx.fillStyle = '#6b7280'
        ctx.font = '28px system-ui, sans-serif'
        ctx.fillText(item.label, labelCol, y + 28)

        // Value (black, bold)
        ctx.fillStyle = '#111827'
        ctx.font = 'bold 32px system-ui, sans-serif'
        ctx.fillText(item.value, valueCol, y + 28)

        y += rowHeight
    }
    y += 30

    // ============================================================
    // Divider
    // ============================================================
    ctx.strokeStyle = '#e5e7eb'
    ctx.beginPath()
    ctx.moveTo(CARD_PADDING, y)
    ctx.lineTo(CARD_WIDTH - CARD_PADDING, y)
    ctx.stroke()
    y += 40

    // ============================================================
    // Total (highlighted box)
    // ============================================================
    const totalBoxHeight = 100
    roundRect(ctx, CARD_PADDING, y, CONTENT_WIDTH, totalBoxHeight, 16)
    ctx.fillStyle = '#dcfce7' // green-100
    ctx.fill()
    ctx.strokeStyle = '#86efac' // green-300
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#166534' // green-800
    ctx.font = '28px system-ui, sans-serif'
    ctx.fillText('Total', CARD_PADDING + 24, y + 45)

    ctx.fillStyle = '#15803d' // green-700
    ctx.font = 'bold 48px system-ui, sans-serif'
    const totalText = formatMoneyBRL(record.totalPrice)
    const totalWidth = ctx.measureText(totalText).width
    ctx.fillText(totalText, CARD_WIDTH - CARD_PADDING - 24 - totalWidth, y + 65)
    y += totalBoxHeight + 40

    // ============================================================
    // Guest notes (optional, max 3 lines)
    // ============================================================
    if (record.notesGuest) {
        ctx.fillStyle = '#4b5563'
        ctx.font = 'italic 24px system-ui, sans-serif'
        ctx.fillText('Observações:', CARD_PADDING, y + 24)
        y += 35

        ctx.fillStyle = '#6b7280'
        ctx.font = '24px system-ui, sans-serif'
        const noteLines = wrapText(ctx, record.notesGuest, CONTENT_WIDTH)
        for (const line of noteLines.slice(0, 3)) {
            ctx.fillText(line, CARD_PADDING, y + 24)
            y += 32
        }
    }

    // ============================================================
    // Footer
    // ============================================================
    y = CARD_HEIGHT - 60
    ctx.fillStyle = '#9ca3af'
    ctx.font = '22px system-ui, sans-serif'
    ctx.fillText('Habitación • Confirmação para o hóspede', CARD_PADDING, y)

    // ============================================================
    // Export to PNG
    // ============================================================
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob)
                else reject(new Error('Failed to generate image'))
            },
            'image/png',
            1.0
        )
    })
}

/**
 * Downloads a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

/**
 * Shares a file via navigator.share (if available)
 * Throws AbortError on user cancel, throws Error on unsupported
 */
export async function shareFile(blob: Blob, filename: string, title: string): Promise<void> {
    const file = new File([blob], filename, { type: 'image/png' })

    // Check if share is supported
    if (!navigator.share) {
        throw new Error('SHARE_NOT_SUPPORTED')
    }

    // Check if file sharing is supported
    if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
        throw new Error('SHARE_NOT_SUPPORTED')
    }

    // This will throw AbortError if user cancels
    await navigator.share({
        title,
        files: [file]
    })
}
