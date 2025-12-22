'use client'

import { useMemo } from 'react'
import { Users, CheckCircle, XCircle } from 'lucide-react'
import type { ReservationV2 } from '@/core/entities_v2'

interface FinalizadasPageProps {
    records: ReservationV2[]
    loading: boolean
    onMarkOk: (r: ReservationV2) => void
    onMarkIssue: (r: ReservationV2) => void
}

function formatBR(iso: string) {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
}

function formatMoney(n: number | undefined) {
    if (n == null) return '—'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export default function FinalizadasPage({
    records,
    loading,
    onMarkOk,
    onMarkIssue,
}: FinalizadasPageProps) {
    // Sort by checkout date (most recent first)
    const sorted = useMemo(() =>
        [...records].sort((a, b) => b.checkOut.localeCompare(a.checkOut)),
        [records]
    )

    return (
        <div className="pb-20">
            <section className="card">
                <h2 className="text-lg font-semibold mb-3 text-app">Estadias Finalizadas</h2>
                <p className="text-sm text-muted mb-4">
                    Revise as estadias que já terminaram e marque como OK ou registre qualquer problema.
                </p>

                {loading ? (
                    <div className="text-sm text-muted">Carregando...</div>
                ) : sorted.length === 0 ? (
                    <div className="text-center py-8">
                        <CheckCircle size={40} className="mx-auto text-success opacity-60 mb-2" />
                        <p className="text-sm text-muted">Nenhuma estadia pendente de revisão.</p>
                    </div>
                ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                        {sorted.map((r) => (
                            <div
                                key={r.id}
                                className="p-4 rounded-xl bg-s1 shadow-app-md border border-app"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="font-medium text-app">{r.guestName}</div>
                                        <div className="text-xs text-muted flex items-center gap-2 mt-1">
                                            <span>{formatBR(r.checkIn)} → {formatBR(r.checkOut)}</span>
                                            <span className="flex items-center gap-1">
                                                <Users size={12} />
                                                {r.partySize}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-success">
                                            {formatMoney(r.totalPrice)}
                                        </div>
                                        {r.extraSpend && r.extraSpend > 0 && (
                                            <div className="text-xs text-muted">
                                                +{formatMoney(r.extraSpend)} extra
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => onMarkOk(r)}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-50  text-success hover:bg-green-100  font-medium text-sm border border-green-200  transition-colors"
                                    >
                                        <CheckCircle size={16} />
                                        OK
                                    </button>
                                    <button
                                        onClick={() => onMarkIssue(r)}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-50  text-danger hover:bg-red-100  font-medium text-sm border border-red-200  transition-colors"
                                    >
                                        <XCircle size={16} />
                                        Problema
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
