'use client'

interface ChipProps {
    children: React.ReactNode
    variant?: 'default' | 'success' | 'warn' | 'danger'
    className?: string
}

/**
 * Chip — Small pill/badge for rooms count, status, etc.
 * 
 * Visual spec (Phase 10.1):
 * - Height: 24-28px
 * - rounded-full
 * - eco-surface-alt background
 * - eco-border border
 */
export default function Chip({ children, variant = 'default', className = '' }: ChipProps) {
    const variantClasses = {
        default: 'chip',
        success: 'chip-success',
        warn: 'chip-warn',
        danger: 'chip-danger',
    }

    return (
        <span className={`${variantClasses[variant]} ${className}`}>
            {children}
        </span>
    )
}

/**
 * RoomsChip — Specific chip for displaying room count
 * Format: "2 quartos" (as per Phase 10.1 spec)
 */
export function RoomsChip({ rooms }: { rooms: number }) {
    if (rooms <= 1) return null
    return (
        <Chip>
            <span className="font-semibold">{rooms}</span>
            <span> quartos</span>
        </Chip>
    )
}
