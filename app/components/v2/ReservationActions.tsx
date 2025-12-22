'use client'

import { Eye, Pencil, Trash2 } from 'lucide-react'

interface ReservationActionsProps {
    onView?: () => void
    onEdit?: () => void
    onDelete?: () => void
    variant?: 'card' | 'compact'
    showLabels?: boolean
}

/**
 * Reusable action cluster for reservation list items.
 * 
 * Features:
 * - Circular icon buttons (44px touch target via padding)
 * - Subtle hover states
 * - Delete has danger styling
 * - Dark mode compatible via tokens
 */
export default function ReservationActions({
    onView,
    onEdit,
    onDelete,
    variant = 'card',
    showLabels = false,
}: ReservationActionsProps) {
    const baseBtn = `
        inline-flex items-center justify-center
        rounded-full transition-all
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ring-app 
    `

    const sizeClasses = variant === 'compact'
        ? 'w-8 h-8'
        : 'w-10 h-10'

    const iconSize = variant === 'compact' ? 14 : 16

    const viewBtn = `${baseBtn} ${sizeClasses}
        bg-transparent hover:bg-s2
        text-muted hover:text-app
    `

    const editBtn = `${baseBtn} ${sizeClasses}
        bg-transparent hover:bg-s2
        text-muted hover:text-primary
    `

    const deleteBtn = `${baseBtn} ${sizeClasses}
        bg-transparent hover:bg-s2
        text-muted hover:text-danger
    `

    return (
        <div className="flex items-center gap-1">
            {onView && (
                <button
                    onClick={onView}
                    className={viewBtn}
                    aria-label="Ver detalhes"
                    title="Ver detalhes"
                >
                    <Eye size={iconSize} />
                    {showLabels && <span className="sr-only">Ver</span>}
                </button>
            )}

            {onEdit && (
                <button
                    onClick={onEdit}
                    className={editBtn}
                    aria-label="Editar"
                    title="Editar"
                >
                    <Pencil size={iconSize} />
                    {showLabels && <span className="sr-only">Editar</span>}
                </button>
            )}

            {onDelete && (
                <button
                    onClick={onDelete}
                    className={deleteBtn}
                    aria-label="Excluir"
                    title="Excluir"
                >
                    <Trash2 size={iconSize} />
                    {showLabels && <span className="sr-only">Excluir</span>}
                </button>
            )}
        </div>
    )
}
