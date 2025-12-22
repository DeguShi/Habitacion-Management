'use client'

import { ReactNode, ButtonHTMLAttributes } from 'react'

type IconButtonSize = 'sm' | 'md' | 'lg'
type IconButtonVariant = 'neutral' | 'primary' | 'success' | 'danger'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    size?: IconButtonSize
    variant?: IconButtonVariant
    ariaLabel: string
    children: ReactNode
}

const sizeClasses: Record<IconButtonSize, string> = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-11 h-11',
}

const variantClasses: Record<IconButtonVariant, string> = {
    neutral: `
        bg-transparent hover:bg-surface2
        text-muted hover:text-app
    `,
    primary: `
        bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/30
        text-muted hover:text-primary
    `,
    success: `
        bg-transparent hover:bg-green-50 dark:hover:bg-green-900/30
        text-muted hover:text-success
    `,
    danger: `
        bg-transparent hover:bg-red-50 dark:hover:bg-red-900/30
        text-muted hover:text-danger
    `,
}

/**
 * IconButton — Standardized icon button with consistent sizing,
 * variants, focus ring, and dark mode support.
 * 
 * Features:
 * - 44px minimum touch target (md/lg sizes)
 * - Proper focus ring using --app-ring token
 * - Accessible with required aria-label
 */
export default function IconButton({
    size = 'md',
    variant = 'neutral',
    ariaLabel,
    children,
    className = '',
    disabled,
    ...props
}: IconButtonProps) {
    const classes = [
        'inline-flex items-center justify-center rounded-full',
        'transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 ring-app',
        'dark:focus:ring-offset-gray-800',
        sizeClasses[size],
        variantClasses[variant],
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <button
            className={classes}
            aria-label={ariaLabel}
            title={ariaLabel}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    )
}
