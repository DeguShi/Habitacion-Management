'use client'

import { useState, useEffect } from 'react'
import { Phone, Mail, Cake, MessageCircle, Check } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { useBirthdayBell } from './BirthdayBellContext'
import type { Contact } from '@/lib/contacts'
import { formatBirthdayShort } from '@/lib/birthdays'

// Storage key for dismissed birthdays (persists for current week)
const DISMISSED_KEY = 'birthday-dismissed'

function getCurrentWeekId(): string {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7)
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function loadDismissed(): Set<string> {
    if (typeof window === 'undefined') return new Set()
    try {
        const stored = localStorage.getItem(DISMISSED_KEY)
        if (!stored) return new Set()
        const { weekId, ids } = JSON.parse(stored)
        if (weekId !== getCurrentWeekId()) return new Set()
        return new Set(ids)
    } catch {
        return new Set()
    }
}

function saveDismissed(ids: Set<string>): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(DISMISSED_KEY, JSON.stringify({
            weekId: getCurrentWeekId(),
            ids: Array.from(ids)
        }))
    } catch {
        // Ignore storage errors
    }
}

interface BirthdayNotificationsSheetProps {
    open: boolean
    onClose: () => void
    contacts: Contact[]
}

function isCleanPhoneForWhatsApp(phone: string | undefined): boolean {
    if (!phone) return false
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 10 && digits.length <= 13
}

function buildWhatsAppLink(phone: string): string {
    let digits = phone.replace(/\D/g, '')
    if (digits.length <= 11) {
        digits = '54' + digits // Argentina country code
    }
    return `https://wa.me/${digits}`
}

export default function BirthdayNotificationsSheet({
    open,
    onClose,
    contacts,
}: BirthdayNotificationsSheetProps) {
    const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed())
    const { setCount } = useBirthdayBell()

    const visibleContacts = contacts.filter(c => !dismissed.has(c.id))

    // Load dismissed on mount
    useEffect(() => {
        setDismissed(loadDismissed())
    }, [])

    // Sync visible count to context whenever it changes
    useEffect(() => {
        setCount(visibleContacts.length)
    }, [visibleContacts.length, setCount])

    function handleDismiss(contactId: string) {
        setDismissed(prev => {
            const next = new Set(prev)
            next.add(contactId)
            saveDismissed(next)
            return next
        })
    }

    return (
        <BottomSheet open={open} onClose={onClose} title="Aniversários da Semana">
            {visibleContacts.length === 0 ? (
                <div className="text-center py-8">
                    <Cake size={48} className="mx-auto mb-3 eco-muted opacity-50" />
                    <p className="text-sm eco-muted">
                        {contacts.length > 0
                            ? 'Todos os aniversários foram marcados ✓'
                            : 'Nenhum aniversário esta semana'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {visibleContacts.map((contact) => (
                        <div
                            key={contact.id}
                            className="mini-card flex items-center justify-between"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="font-medium eco-text truncate">
                                    {contact.name}
                                </div>
                                <div className="flex items-center gap-3 text-sm eco-muted mt-1">
                                    {contact.phone && (
                                        <a
                                            href={`tel:${contact.phone}`}
                                            className="flex items-center gap-1 hover:text-primary"
                                        >
                                            <Phone size={14} />
                                            <span className="truncate">{contact.phone}</span>
                                        </a>
                                    )}
                                    {!contact.phone && contact.email && (
                                        <a
                                            href={`mailto:${contact.email}`}
                                            className="flex items-center gap-1 hover:text-primary"
                                        >
                                            <Mail size={14} />
                                            <span className="truncate">{contact.email}</span>
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-3">
                                <div className="flex items-center gap-1 text-sm font-medium text-[var(--eco-warning)]">
                                    <Cake size={16} />
                                    {formatBirthdayShort(contact.birthDate)}
                                </div>

                                {isCleanPhoneForWhatsApp(contact.phone) && (
                                    <a
                                        href={buildWhatsAppLink(contact.phone!)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                                        aria-label="Enviar WhatsApp"
                                    >
                                        <MessageCircle size={18} />
                                    </a>
                                )}

                                <button
                                    onClick={() => handleDismiss(contact.id)}
                                    className="p-2 rounded-lg bg-[var(--eco-success)] text-white hover:opacity-80 transition-colors"
                                    aria-label="Marcar como visto"
                                    title="Marcar como visto"
                                >
                                    <Check size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </BottomSheet>
    )
}
