'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
    open: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
}

/**
 * Mobile-safe bottom sheet component.
 * - Max height with internal scroll
 * - Backdrop click to close
 * - Prevents background scroll when open
 * - Dark mode compatible
 */
export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null)

    // Prevent background scroll when open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [open])

    // Close on Escape key
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className="relative z-10 w-full max-w-lg bg-token-surface rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-token shrink-0">
                    <h2 className="text-lg font-semibold text-token">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Fechar"
                    >
                        <X size={20} className="text-token-muted" />
                    </button>
                </div>

                {/* Content with scroll */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {children}
                </div>
            </div>
        </div>
    )
}

