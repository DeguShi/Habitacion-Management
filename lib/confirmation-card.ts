/**
 * Confirmation Card Generator v2 (ES, v1-Style)
 * 
 * Generates a professional PNG image for reservation confirmation cards.
 * Portrait 1080×1920 layout with centered logo, Spanish labels, v1-style symmetric design.
 */

import type { ReservationV2, Payment } from '@/core/entities_v2'

// ============================================================
// Spanish Labels (ES)
// ============================================================

export const LABELS_ES = {
    title: 'Confirmación de Reserva',
    client: 'Cliente',
    persons: 'Personas',
    rooms: 'Habitaciones',
    checkIn: 'Check-in',       // Keep in English per user request
    checkOut: 'Check-out',     // Keep in English per user request
    nights: 'Noches',
    breakfast: 'Desayuno',
    deposit: 'Depósito',
    total: 'Total',
    footer: 'Habitación • Confirmación para el huésped',
    yes: 'Sí',
    no: 'No',
    paid: 'Pagado',
    pending: 'Pendiente',
    statusConfirmed: 'Confirmada',
    statusWaiting: 'En espera',
    statusRejected: 'Cancelada',
}

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
 * Gets status label in Spanish
 */
export function getStatusLabelES(status?: string): string {
    switch (status) {
        case 'confirmed': return LABELS_ES.statusConfirmed
        case 'waiting': return LABELS_ES.statusWaiting
        case 'rejected': return LABELS_ES.statusRejected
        default: return LABELS_ES.statusConfirmed // Legacy v1 records
    }
}

/**
 * Gets status label in Portuguese (for UI, kept for backward compatibility)
 */
export function getStatusLabel(status?: string): string {
    switch (status) {
        case 'confirmed': return 'Confirmada'
        case 'waiting': return 'Em Espera'
        case 'rejected': return 'Cancelada'
        default: return 'Confirmada'
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
 * Formats boolean as Sí/No in Spanish
 */
export function formatYesNoES(value: boolean | undefined): string {
    return value ? LABELS_ES.yes : LABELS_ES.no
}

/**
 * Gets deposit status label in Spanish
 */
export function getDepositLabelES(payment?: Payment): string {
    // Check if deposit marked as paid
    if (payment?.deposit?.paid) {
        const amount = payment.deposit.due
        return amount ? `${LABELS_ES.paid} (${formatMoneyBRL(amount)})` : LABELS_ES.paid
    }
    // Check if any payment events exist
    const totalPaid = payment?.events?.reduce((s, e) => s + (e.amount || 0), 0) || 0
    if (totalPaid > 0) return `${LABELS_ES.paid} (${formatMoneyBRL(totalPaid)})`
    return LABELS_ES.pending
}

/**
 * Gets deposit status label (Portuguese, for backward compat)
 */
export function getDepositLabel(payment?: Payment): string {
    if (payment?.deposit?.paid) {
        const amount = payment.deposit.due
        return amount ? `Pago (${formatMoneyBRL(amount)})` : 'Pago'
    }
    const totalPaid = payment?.events?.reduce((s, e) => s + (e.amount || 0), 0) || 0
    if (totalPaid > 0) return `Pago (${formatMoneyBRL(totalPaid)})`
    return 'Pendente'
}

// ============================================================
// Card Generation
// ============================================================

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1920
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
 * Draws a rounded rectangle path
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
 * Professional v1-style layout: 1080×1920 portrait, centered logo, Spanish labels
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

    let y = 80

    // ============================================================
    // Logo (CENTERED, LARGER - 280px wide)
    // ============================================================
    const logo = await loadImage('/logo-hab.png', 2000)
    if (logo) {
        const logoWidth = 280
        const logoHeight = logoWidth * (logo.height / logo.width)
        const logoX = (CARD_WIDTH - logoWidth) / 2
        ctx.drawImage(logo, logoX, y, logoWidth, logoHeight)
        y += logoHeight + 50
    } else {
        // Fallback: text branding
        ctx.fillStyle = '#374151'
        ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Habitación Familiar', CARD_WIDTH / 2, y + 40)
        ctx.textAlign = 'left'
        y += 80
    }

    // ============================================================
    // Title: "Confirmación de Reserva" (CENTERED)
    // ============================================================
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 52px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(LABELS_ES.title, CARD_WIDTH / 2, y + 52)
    ctx.textAlign = 'left'
    y += 100

    // ============================================================
    // Status badge (CENTERED)
    // ============================================================
    const statusLabel = getStatusLabelES(record.status)
    ctx.font = 'bold 28px system-ui, sans-serif'
    const badgeWidth = ctx.measureText(statusLabel).width + 50
    const badgeX = (CARD_WIDTH - badgeWidth) / 2

    roundRect(ctx, badgeX, y, badgeWidth, 50, 25)
    ctx.fillStyle = getStatusColor(record.status)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.fillText(statusLabel, CARD_WIDTH / 2, y + 35)
    ctx.textAlign = 'left'
    y += 90

    // ============================================================
    // Guest name (CENTERED, LARGE, CAPS)
    // ============================================================
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif'
    const guestName = (record.guestName || 'Huésped').toUpperCase()
    const nameLines = wrapText(ctx, guestName, CONTENT_WIDTH - 40)

    ctx.textAlign = 'center'
    for (const line of nameLines.slice(0, 2)) {
        ctx.fillText(line, CARD_WIDTH / 2, y + 48)
        y += 60
    }
    ctx.textAlign = 'left'
    y += 40

    // ============================================================
    // Divider
    // ============================================================
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(CARD_PADDING, y)
    ctx.lineTo(CARD_WIDTH - CARD_PADDING, y)
    ctx.stroke()
    y += 50

    // ============================================================
    // Data table (TWO COLUMNS: labels left, values RIGHT-ALIGNED)
    // ============================================================
    const leftX = CARD_PADDING + 20
    const rightX = CARD_WIDTH - CARD_PADDING - 20
    const rowHeight = 60

    const dataItems = [
        { label: LABELS_ES.client, value: record.guestName || '—' },
        { label: LABELS_ES.persons, value: String(record.partySize || 1) },
        { label: LABELS_ES.rooms, value: String(record.rooms ?? 1) },
        { label: LABELS_ES.checkIn, value: formatDateBR(record.checkIn) },
        { label: LABELS_ES.checkOut, value: formatDateBR(record.checkOut) },
        { label: LABELS_ES.nights, value: String(nights) },
        { label: LABELS_ES.breakfast, value: formatYesNoES(record.breakfastIncluded) },
        { label: LABELS_ES.deposit, value: getDepositLabelES(record.payment) },
    ]

    for (const item of dataItems) {
        // Label (left, gray)
        ctx.fillStyle = '#6b7280'
        ctx.font = '30px system-ui, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(item.label, leftX, y + 30)

        // Value (right-aligned, bold, black)
        ctx.fillStyle = '#111827'
        ctx.font = 'bold 32px system-ui, sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(item.value, rightX, y + 30)
        ctx.textAlign = 'left'

        y += rowHeight
    }
    y += 30

    // ============================================================
    // Divider
    // ============================================================
    ctx.strokeStyle = '#d1d5db'
    ctx.beginPath()
    ctx.moveTo(CARD_PADDING, y)
    ctx.lineTo(CARD_WIDTH - CARD_PADDING, y)
    ctx.stroke()
    y += 40

    // ============================================================
    // Total (GREEN BOX - v1 style)
    // ============================================================
    const totalBoxHeight = 100
    const totalBoxY = y

    roundRect(ctx, CARD_PADDING, totalBoxY, CONTENT_WIDTH, totalBoxHeight, 16)
    ctx.fillStyle = '#dcfce7' // green-100
    ctx.fill()
    ctx.strokeStyle = '#86efac' // green-300
    ctx.lineWidth = 3
    ctx.stroke()

    // "Total" label (left)
    ctx.fillStyle = '#166534' // green-800
    ctx.font = 'bold 32px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(LABELS_ES.total, CARD_PADDING + 30, totalBoxY + 62)

    // Total value (right, large)
    ctx.fillStyle = '#15803d' // green-700
    ctx.font = 'bold 48px system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(formatMoneyBRL(record.totalPrice), CARD_WIDTH - CARD_PADDING - 30, totalBoxY + 65)
    ctx.textAlign = 'left'

    y += totalBoxHeight + 50

    // ============================================================
    // Guest notes (optional, max 3 lines)
    // ============================================================
    if (record.notesGuest) {
        ctx.fillStyle = '#4b5563'
        ctx.font = 'italic 26px system-ui, sans-serif'
        ctx.textAlign = 'center'

        const noteLines = wrapText(ctx, record.notesGuest, CONTENT_WIDTH - 40)
        for (const line of noteLines.slice(0, 3)) {
            ctx.fillText(line, CARD_WIDTH / 2, y + 26)
            y += 36
        }
        ctx.textAlign = 'left'
    }

    // ============================================================
    // Footer (CENTERED)
    // ============================================================
    y = CARD_HEIGHT - 80
    ctx.fillStyle = '#9ca3af'
    ctx.font = '24px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(LABELS_ES.footer, CARD_WIDTH / 2, y)
    ctx.textAlign = 'left'

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
