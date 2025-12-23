'use client'

import { AlertTriangle } from 'lucide-react'

interface DeleteConfirmDialogProps {
    open: boolean
    guestName: string
    onConfirm: () => void
    onCancel: () => void
}

/**
 * Custom delete confirmation dialog with eco styling.
 * Replaces browser confirm() for better UX.
 */
export default function DeleteConfirmDialog({
    open,
    guestName,
    onConfirm,
    onCancel,
}: DeleteConfirmDialogProps) {
    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Dialog */}
            <div
                className="relative z-10 w-full max-w-sm eco-surface rounded-2xl shadow-xl p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-4">
                    <div className="p-2 rounded-full bg-red-100 text-[var(--eco-danger)]">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold eco-text mb-2">
                            Excluir reserva?
                        </h3>
                        <p className="text-sm eco-muted mb-4">
                            A reserva de <strong>{guestName}</strong> será excluída permanentemente.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={onCancel}
                                className="flex-1 px-4 py-2 rounded-lg border border-[var(--eco-border)] eco-text hover:bg-[var(--eco-surface-alt)] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 px-4 py-2 rounded-lg bg-[var(--eco-danger)] text-white hover:opacity-90 transition-colors"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
