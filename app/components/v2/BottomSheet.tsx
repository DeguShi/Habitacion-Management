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
                className="absolute inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className="relative z-10 w-full max-w-lg bg-white rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Fechar"
                    >
                        <X size={20} className="text-gray-500" />
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
