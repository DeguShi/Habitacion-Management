// Storage key for dismissed birthdays (persists for current week)
const DISMISSED_KEY = 'birthday-dismissed'

function getCurrentWeekId(): string {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7)
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

export function loadDismissedBirthdays(): Set<string> {
    if (typeof window === 'undefined') return new Set()
    try {
        const stored = localStorage.getItem(DISMISSED_KEY)
        if (!stored) return new Set()
        const { weekId, ids } = JSON.parse(stored)
        if (weekId !== getCurrentWeekId()) return new Set()
        return new Set(ids)
    } catch {
        return new Set()
    }
}

export function saveDismissedBirthdays(ids: Set<string>): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(DISMISSED_KEY, JSON.stringify({
            weekId: getCurrentWeekId(),
            ids: Array.from(ids)
        }))
        // Dispatch a custom event so other components can react
        window.dispatchEvent(new CustomEvent('birthday-dismissed-change'))
    } catch {
        // Ignore storage errors
    }
}
