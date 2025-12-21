'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
    theme: Theme
    setTheme: (theme: Theme) => void
    resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'hab:theme'

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('system')
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
    const [mounted, setMounted] = useState(false)

    // Resolve the actual theme (system -> light/dark)
    const resolveTheme = useCallback((t: Theme): 'light' | 'dark' => {
        if (t === 'system') return getSystemTheme()
        return t
    }, [])

    // Apply theme to document
    const applyTheme = useCallback((resolved: 'light' | 'dark') => {
        const root = document.documentElement
        if (resolved === 'dark') {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
        setResolvedTheme(resolved)
    }, [])

    // Set theme and persist
    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem(STORAGE_KEY, newTheme)
        applyTheme(resolveTheme(newTheme))
    }, [applyTheme, resolveTheme])

    // Initialize on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
        const initial = stored || 'system'
        setThemeState(initial)
        applyTheme(resolveTheme(initial))
        setMounted(true)
    }, [applyTheme, resolveTheme])

    // Listen for system theme changes
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => {
            if (theme === 'system') {
                applyTheme(getSystemTheme())
            }
        }
        media.addEventListener('change', handler)
        return () => media.removeEventListener('change', handler)
    }, [theme, applyTheme])

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return null
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider')
    }
    return context
}
