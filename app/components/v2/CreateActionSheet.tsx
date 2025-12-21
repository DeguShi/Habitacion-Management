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
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                >
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <FileText size={20} className="text-orange-600" />
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">Pedido de reserva</div>
                        <div className="text-sm text-gray-500">Adicionar à lista de espera</div>
                    </div>
                </button>

                {/* Create Confirmed */}
                <button
                    onClick={() => {
                        onClose()
                        onCreateConfirmed()
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors text-left"
                >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Check size={20} className="text-green-600" />
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">Reserva confirmada</div>
                        <div className="text-sm text-gray-500">Criar reserva completa agora</div>
                    </div>
                </button>
            </div>
        </BottomSheet>
    )
}
