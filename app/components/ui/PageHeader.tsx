'use client'

interface PageHeaderProps {
    title: string
    subtitle?: string
    right?: React.ReactNode
    className?: string
}

/**
 * PageHeader — Unified header component for v2 pages.
 * 
 * Provides consistent title + optional subtitle + optional right actions.
 */
export default function PageHeader({
    title,
    subtitle,
    right,
    className = ''
}: PageHeaderProps) {
    return (
        <div className={`flex items-center justify-between mb-4 ${className}`}>
            <div>
                <h1 className="text-xl font-semibold eco-text">{title}</h1>
                {subtitle && (
                    <p className="text-sm eco-muted mt-0.5">{subtitle}</p>
                )}
            </div>
            {right && (
                <div className="flex items-center gap-2">
                    {right}
                </div>
            )}
        </div>
    )
}
