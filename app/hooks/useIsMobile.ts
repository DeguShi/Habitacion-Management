'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to detect if the current viewport is mobile-sized.
 * Uses matchMedia for reliable breakpoint detection.
 * 
 * @param breakpoint - Max width in pixels (default: 768 = md breakpoint)
 * @returns boolean indicating if viewport is mobile
 */
export function useIsMobile(breakpoint: number = 768): boolean {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)

        function handleChange(e: MediaQueryListEvent | MediaQueryList) {
            setIsMobile(e.matches)
        }

        // Set initial value
        handleChange(mq)

        // Listen for changes
        mq.addEventListener('change', handleChange)
        return () => mq.removeEventListener('change', handleChange)
    }, [breakpoint])

    return isMobile
}
