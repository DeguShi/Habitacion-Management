'use client'

import type { LucideIcon } from 'lucide-react'

/**
 * Icon size presets
 * sm: 16px - inline text, small buttons
 * md: 20px - default, nav items, action buttons  
 * lg: 24px - prominent icons, empty states
 * xl: 32px - hero icons, large empty states
 */
const sizes = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
} as const

type IconSize = keyof typeof sizes

interface IconProps {
    icon: LucideIcon
    size?: IconSize
    className?: string
    'aria-label'?: string
}

/**
 * Standardized icon component for consistent sizing across the app.
 * 
 * Usage:
 * ```tsx
 * import { Calendar } from 'lucide-react'
 * import { Icon } from '@/app/components/ui/Icon'
 * 
 * <Icon icon={Calendar} size="md" />
 * ```
 */
export default function Icon({
    icon: IconComponent,
    size = 'md',
    className = '',
    'aria-label': ariaLabel,
}: IconProps) {
    return (
        <IconComponent
            size={sizes[size]}
            className={className}
            aria-label={ariaLabel}
            aria-hidden={!ariaLabel}
        />
    )
}

// Re-export for convenience
export { Icon }
export type { IconSize, IconProps }
