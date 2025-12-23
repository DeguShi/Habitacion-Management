import '../globals.css'

export const metadata = {
    title: 'Habitación v2 — Reservas',
    description: 'Nova interface de reservas',
}

export default function V2Layout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR">
            <body className="bg-gray-50">
                {/* No navbar - mobile-first with bottom nav */}
                {children}
            </body>
        </html>
    )
}
