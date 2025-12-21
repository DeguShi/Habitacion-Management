import './globals.css'
import Navbar from './components/Navbar'
import { NextAuthProvider } from '@/lib/auth.client' // wraps SessionProvider
import { ThemeProvider } from './components/ThemeProvider'

export const metadata = {
  title: 'Habitación Familiar de Lisiani y Airton',
  description: 'Reservas simples, seguras e na nuvem.',
}

// Anti-flicker script for dark mode
// Runs before React hydrates to prevent flash of wrong theme
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('hab:theme');
    var isDark = theme === 'dark' || 
      ((!theme || theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <NextAuthProvider>
            <Navbar />
            {children}
          </NextAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}