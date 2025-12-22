import './globals.css'
import Navbar from './components/Navbar'
import { NextAuthProvider } from '@/lib/auth.client' // wraps SessionProvider

export const metadata = {
  title: 'Habitación Familiar de Lisiani y Airton',
  description: 'Reservas simples, seguras e na nuvem.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head />
      <body>
        <NextAuthProvider>
          <Navbar />
          {children}
        </NextAuthProvider>
      </body>
    </html>
  )
}