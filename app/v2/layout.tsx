export const metadata = {
    title: 'Habitación v2 — Reservas',
    description: 'Nova interface de reservas',
}

export default function V2Layout({ children }: { children: React.ReactNode }) {
    // V2 uses the root layout which already includes BirthdayBellProvider
    // This layout just passes through children
    return <>{children}</>
}
