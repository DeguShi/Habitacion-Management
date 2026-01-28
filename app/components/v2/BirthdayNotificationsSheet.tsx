'use client'

import { Phone, Mail, Cake, MessageCircle } from 'lucide-react'
import BottomSheet from './BottomSheet'
import type { Contact } from '@/lib/contacts'
import { formatBirthdayShort } from '@/lib/birthdays'

interface BirthdayNotificationsSheetProps {
    open: boolean
    onClose: () => void
    contacts: Contact[]
}

/**
 * Checks if a phone number is clean enough for WhatsApp link.
 * Must be 10-11 digits (Brazilian patterns: DDD + number).
 */
function isCleanPhoneForWhatsApp(phone: string | undefined): boolean {
    if (!phone) return false
    const digits = phone.replace(/\D/g, '')
    // BR mobile: 11 digits (with 9), BR landline: 10 digits
    // Could also have country code +55 (13 digits)
    return digits.length >= 10 && digits.length <= 13
}

/**
 * Builds WhatsApp link for a phone number.
 * Assumes Brazilian phone, adds +55 if not present.
 */
function buildWhatsAppLink(phone: string): string {
    let digits = phone.replace(/\D/g, '')
    // Add Brazil country code if not present
    if (digits.length <= 11) {
        digits = '55' + digits
    }
    return `https://wa.me/${digits}`
}

export default function BirthdayNotificationsSheet({
    open,
    onClose,
    contacts,
}: BirthdayNotificationsSheetProps) {
    if (!open) return null

    return (
        <BottomSheet open={open} onClose={onClose} title="Aniversários da Semana">
            {contacts.length === 0 ? (
                <div className="text-center py-8">
                    <Cake size={48} className="mx-auto mb-3 eco-muted opacity-50" />
                    <p className="text-sm eco-muted">Nenhum aniversário esta semana</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {contacts.map((contact) => (
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
                                {/* Birthday badge */}
                                <div className="flex items-center gap-1 text-sm font-medium text-[var(--eco-warning)]">
                                    <Cake size={16} />
                                    {formatBirthdayShort(contact.birthDate)}
                                </div>

                                {/* WhatsApp link if phone is clean */}
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
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </BottomSheet>
    )
}
