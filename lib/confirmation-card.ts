/**
 * Confirmation Card Generator
 * 
 * Generates a PNG image for reservation confirmation cards.
 * Used for sharing via WhatsApp or downloading.
 */

import type { ReservationV2 } from '@/core/entities_v2'

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

// ============================================================
// Card Generation
// ============================================================

const CARD_WIDTH = 1080
const CARD_PADDING = 60
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
 * Renders a confirmation card as PNG Blob
 * Uses HiDPI rendering for sharp output on retina displays
 */
export async function renderConfirmationCard(record: ReservationV2): Promise<Blob> {
    // Calculate nights
    const nights = (() => {
        if (!record.checkIn || !record.checkOut) return 1
        const d1 = new Date(record.checkIn + 'T00:00:00')
        const d2 = new Date(record.checkOut + 'T00:00:00')
        return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
    })()

    // HiDPI scale factor
    const scale = clampDevicePixelRatio()

    // Pre-calculate height based on content
    const baseHeight = 600
    const notesHeight = (record.notesGuest ? 80 : 0)
    const logicalHeight = baseHeight + notesHeight

    // Create canvas with HiDPI support
    const canvas = document.createElement('canvas')
    canvas.width = CARD_WIDTH * scale
    canvas.height = logicalHeight * scale

    const ctx = canvas.getContext('2d')!

    // Scale context for HiDPI
    ctx.scale(scale, scale)

    // Enable high-quality image rendering
    ctx.imageSmoothingEnabled = true
    if ('imageSmoothingQuality' in ctx) {
        (ctx as any).imageSmoothingQuality = 'high'
    }

    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CARD_WIDTH, logicalHeight)

    // Header accent bar
    ctx.fillStyle = getStatusColor(record.status)
    ctx.fillRect(0, 0, CARD_WIDTH, 8)

    let y = 50

    // Try to load logo
    const logo = await loadImage('/logo-hab.png', 2000)
    if (logo) {
        const logoHeight = 60
        const logoWidth = logoHeight * (logo.width / logo.height)
        ctx.drawImage(logo, CARD_PADDING, y, logoWidth, logoHeight)
        y += logoHeight + 20
    }

    // Status badge
    ctx.fillStyle = getStatusColor(record.status)
    ctx.font = 'bold 24px system-ui, sans-serif'
    const statusText = getStatusLabel(record.status).toUpperCase()
    ctx.fillText(statusText, CARD_PADDING, y + 24)
    y += 50

    // Guest name
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 42px system-ui, sans-serif'
    const nameLines = wrapText(ctx, record.guestName || 'Hóspede', CONTENT_WIDTH)
    for (const line of nameLines) {
        ctx.fillText(line, CARD_PADDING, y + 42)
        y += 50
    }
    y += 20

    // Divider
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(CARD_PADDING, y)
    ctx.lineTo(CARD_WIDTH - CARD_PADDING, y)
    ctx.stroke()
    y += 30

    // Info grid
    ctx.font = '28px system-ui, sans-serif'
    ctx.fillStyle = '#6b7280'

    const infoItems = [
        { label: 'Check-in', value: formatDateBR(record.checkIn) },
        { label: 'Check-out', value: formatDateBR(record.checkOut) },
        { label: 'Noites', value: String(nights) },
        { label: 'Hóspedes', value: String(record.partySize || 1) },
        { label: 'Quartos', value: String(record.rooms ?? 1) },
    ]

    for (const item of infoItems) {
        ctx.fillStyle = '#6b7280'
        ctx.font = '24px system-ui, sans-serif'
        ctx.fillText(item.label, CARD_PADDING, y + 24)

        ctx.fillStyle = '#111827'
        ctx.font = 'bold 28px system-ui, sans-serif'
        ctx.fillText(item.value, CARD_PADDING + 200, y + 24)
        y += 40
    }
    y += 20

    // Divider
    ctx.strokeStyle = '#e5e7eb'
    ctx.beginPath()
    ctx.moveTo(CARD_PADDING, y)
    ctx.lineTo(CARD_WIDTH - CARD_PADDING, y)
    ctx.stroke()
    y += 30

    // Total price
    ctx.fillStyle = '#6b7280'
    ctx.font = '24px system-ui, sans-serif'
    ctx.fillText('Total', CARD_PADDING, y + 24)

    ctx.fillStyle = '#16a34a'
    ctx.font = 'bold 36px system-ui, sans-serif'
    ctx.fillText(formatMoneyBRL(record.totalPrice), CARD_PADDING + 200, y + 28)
    y += 50

    // Guest notes (if any)
    if (record.notesGuest) {
        y += 10
        ctx.fillStyle = '#9ca3af'
        ctx.font = 'italic 22px system-ui, sans-serif'
        const noteLines = wrapText(ctx, record.notesGuest, CONTENT_WIDTH)
        for (const line of noteLines.slice(0, 2)) { // Max 2 lines
            ctx.fillText(line, CARD_PADDING, y + 22)
            y += 30
        }
    }

    // Footer
    y = logicalHeight - 40
    ctx.fillStyle = '#d1d5db'
    ctx.font = '18px system-ui, sans-serif'
    ctx.fillText('Habitación Management', CARD_PADDING, y)

    // Convert to blob
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
