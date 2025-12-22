'use client'

import { useState, useEffect } from 'react'

/**
 * useIsMobile — Detects if viewport is mobile-sized (<1024px).
 * SSR-safe: returns `false` on server, updates on client mount.
 */
export function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 1023px)')

        const handler = (e: MediaQueryListEvent | MediaQueryList) => {
            setIsMobile(e.matches)
        }

        // Set initial value
        handler(mq)

        // Listen for changes
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    return isMobile
}
