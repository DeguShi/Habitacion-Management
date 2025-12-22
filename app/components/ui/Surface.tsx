'use client'

import { ReactNode } from 'react'

interface SurfaceProps {
    variant?: 'surface' | 'surface2' | 'surface3'
    padding?: 'none' | 'sm' | 'md' | 'lg'
    rounded?: 'none' | 'lg' | 'xl' | '2xl'
    className?: string
    children: ReactNode
}

const paddingMap = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
}

const roundedMap = {
    none: '',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
}

const variantMap = {
    surface: 'bg-surface',
    surface2: 'bg-surface2',
    surface3: 'bg-surface3',
}

/**
 * Surface — A semantic wrapper for cards and sections.
 * Uses design tokens for consistent dark mode support.
 */
export default function Surface({
    variant = 'surface',
    padding = 'md',
    rounded = '2xl',
    className = '',
    children,
}: SurfaceProps) {
    const classes = [
        variantMap[variant],
        paddingMap[padding],
        roundedMap[rounded],
        className,
    ]
        .filter(Boolean)
        .join(' ')

    return <div className={classes}>{children}</div>
}
