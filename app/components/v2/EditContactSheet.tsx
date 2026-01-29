'use client'

import { useState, useEffect } from 'react'
import { User, Phone, Mail, Cake } from 'lucide-react'
import BottomSheet from './BottomSheet'
import type { Contact } from '@/lib/contacts'
import type { ContactEditValues } from '@/lib/contact-edit'

interface EditContactSheetProps {
    open: boolean
    onClose: () => void
    contact: Contact | null
    onSave: (contactId: string, values: ContactEditValues) => Promise<void>
}

/**
 * Converts birthDate from DD/MM/YYYY or YYYY-MM-DD to YYYY-MM-DD for HTML date input.
 * Returns empty string if invalid/empty.
 */
function toHtmlDateFormat(birthDate: string | undefined): string {
    if (!birthDate) return ''
    const trimmed = birthDate.trim()

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed
    }

    // DD/MM/YYYY format
    const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
    if (ddmmyyyy) {
        const [, dd, mm, yyyy] = ddmmyyyy
        return `${yyyy}-${mm}-${dd}`
    }

    // DD-MM-YYYY format
    const ddmmyyyyDash = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed)
    if (ddmmyyyyDash) {
        const [, dd, mm, yyyy] = ddmmyyyyDash
        return `${yyyy}-${mm}-${dd}`
    }

    return ''
}

export default function EditContactSheet({
    open,
    onClose,
    contact,
    onSave,
}: EditContactSheetProps) {
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Reset form when contact changes
    useEffect(() => {
        if (contact) {
            setName(contact.name || '')
            setPhone(contact.phone || '')
            setEmail(contact.email || '')
            // Convert birthDate to YYYY-MM-DD for HTML input
            setBirthDate(toHtmlDateFormat(contact.birthDate))
            setError(null)
        }
    }, [contact])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!contact) return

        const trimmedName = name.trim()
        if (!trimmedName) {
            setError('Nome é obrigatório')
            return
        }

        setSaving(true)
        setError(null)

        try {
            await onSave(contact.id, {
                name: trimmedName,
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
                birthDate: birthDate.trim() || undefined,
            })
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao salvar')
        } finally {
            setSaving(false)
        }
    }

    if (!contact) return null

    return (
        <BottomSheet open={open} onClose={onClose} title="Editar Contato">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium eco-text mb-1">
                        <User size={14} className="inline mr-1" />
                        Nome *
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input w-full"
                        placeholder="Nome do contato"
                        disabled={saving}
                    />
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-sm font-medium eco-text mb-1">
                        <Phone size={14} className="inline mr-1" />
                        Telefone
                    </label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input w-full"
                        placeholder="+54 11 1234-5678"
                        disabled={saving}
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-medium eco-text mb-1">
                        <Mail size={14} className="inline mr-1" />
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input w-full"
                        placeholder="email@exemplo.com"
                        disabled={saving}
                    />
                </div>

                {/* Birthday */}
                <div>
                    <label className="block text-sm font-medium eco-text mb-1">
                        <Cake size={14} className="inline mr-1" />
                        Data de Nascimento
                    </label>
                    <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="input w-full"
                        disabled={saving}
                    />
                </div>

                {/* Error message */}
                {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary flex-1"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn flex-1"
                        disabled={saving}
                    >
                        {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </form>
        </BottomSheet>
    )
}
