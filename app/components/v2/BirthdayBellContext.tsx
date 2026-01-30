'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface BirthdayBellContextValue {
    count: number
    setCount: (count: number) => void
    isOpen: boolean
    openSheet: () => void
    closeSheet: () => void
}

const BirthdayBellContext = createContext<BirthdayBellContextValue | null>(null)

export function BirthdayBellProvider({ children }: { children: ReactNode }) {
    const [count, setCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

    const openSheet = useCallback(() => setIsOpen(true), [])
    const closeSheet = useCallback(() => setIsOpen(false), [])

    return (
        <BirthdayBellContext.Provider value={{ count, setCount, isOpen, openSheet, closeSheet }}>
            {children}
        </BirthdayBellContext.Provider>
    )
}

export function useBirthdayBell() {
    const ctx = useContext(BirthdayBellContext)
    if (!ctx) {
        // Return no-op values when not in v2 context
        return {
            count: 0,
            setCount: () => { },
            isOpen: false,
            openSheet: () => { },
            closeSheet: () => { },
        }
    }
    return ctx
}
