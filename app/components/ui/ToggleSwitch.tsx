'use client'

interface ToggleSwitchProps {
    id: string
    checked: boolean
    onChange: (checked: boolean) => void
    label: string
    disabled?: boolean
}

export default function ToggleSwitch({ id, checked, onChange, label, disabled }: ToggleSwitchProps) {
    return (
        <label
            htmlFor={id}
            className={`flex items-center gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <div className="relative">
                <input
                    type="checkbox"
                    id={id}
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                    className="sr-only peer"
                />
                <div className={`
                    w-11 h-6 rounded-full
                    transition-colors duration-200 ease-in-out
                    ${checked
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }
                `} />
                <div className={`
                    absolute top-0.5 left-0.5
                    w-5 h-5 rounded-full bg-white
                    shadow-md
                    transition-transform duration-200 ease-in-out
                    ${checked ? 'translate-x-5' : 'translate-x-0'}
                `} />
            </div>
            <span className="text-sm eco-text">{label}</span>
        </label>
    )
}
