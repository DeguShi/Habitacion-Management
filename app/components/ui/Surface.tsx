'use client'

import { ReactNode } from 'react'

interface SurfaceProps {
    variant?: 's1' | 's2' | 's3'
    padding?: 'none' | 'sm' | 'md' | 'lg'
    rounded?: 'none' | 'lg' | 'xl' | '2xl'
    border?: boolean
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
    s1: 'bg-s1',
    s2: 'bg-s2',
    s3: 'bg-s3',
}

/**
 * Surface — A semantic wrapper for cards and sections.
 * Uses design tokens for consistent dark mode support.
 * 
 * Variants:
 * - s1: main surface (cards, sheets)
 * - s2: nested/secondary panels
 * - s3: elevated/selected states
 */
export default function Surface({
    variant = 's1',
    padding = 'md',
    rounded = '2xl',
    border = false,
    className = '',
    children,
}: SurfaceProps) {
    const classes = [
        variantMap[variant],
        paddingMap[padding],
        roundedMap[rounded],
        border ? 'border border-app' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ')

    return <div className={classes}>{children}</div>
}
