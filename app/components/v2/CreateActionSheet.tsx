'use client'

import { FileText, Check } from 'lucide-react'
import BottomSheet from './BottomSheet'

interface CreateActionSheetProps {
    open: boolean
    onClose: () => void
    onCreateLead: () => void
    onCreateConfirmed: () => void
}

/**
 * Action sheet for choosing between creating a lead (waiting) or confirmed reservation.
 */
export default function CreateActionSheet({
    open,
    onClose,
    onCreateLead,
    onCreateConfirmed,
}: CreateActionSheetProps) {
    return (
        <BottomSheet open={open} onClose={onClose} title="Adicionar">
            <div className="space-y-3">
                {/* Create Lead (Waiting) */}
                <button
                    onClick={() => {
                        onClose()
                        onCreateLead()
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-app bg-s1 hover:bg-s2 transition-colors text-left"
                >
                    <div className="w-10 h-10 rounded-full panel-warn flex items-center justify-center">
                        <FileText size={20} />
                    </div>
                    <div>
                        <div className="font-medium text-app">Pedido de reserva</div>
                        <div className="text-sm text-muted">Adicionar à lista de espera</div>
                    </div>
                </button>

                {/* Create Confirmed */}
                <button
                    onClick={() => {
                        onClose()
                        onCreateConfirmed()
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-app bg-s1 hover:bg-s2 transition-colors text-left"
                >
                    <div className="w-10 h-10 rounded-full panel-success flex items-center justify-center">
                        <Check size={20} />
                    </div>
                    <div>
                        <div className="font-medium text-app">Reserva confirmada</div>
                        <div className="text-sm text-muted">Criar reserva completa agora</div>
                    </div>
                </button>
            </div>
        </BottomSheet>
    )
}
