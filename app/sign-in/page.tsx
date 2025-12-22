'use client'

import { useState } from 'react'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { CalendarDays, Users, Coffee, ShieldCheck, Loader2 } from 'lucide-react'

export default function SignInPage() {
  const [loading, setLoading] = useState(false)

  function handleSignIn() {
    setLoading(true)
    signIn('google', { callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen eco-bg flex items-center justify-center p-4">
      {/* Centered card */}
      <div className="w-full max-w-md eco-surface border border-[var(--eco-border)] rounded-2xl shadow-sm p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo-hab.png"
            alt="Habitación Familiar"
            width={80}
            height={80}
            className="rounded-xl shadow-sm"
            priority
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold eco-text text-center mb-2">
          Bem-vindo
        </h1>
        <p className="text-sm eco-muted text-center mb-6">
          Acesse para gerenciar reservas, contatos e pagamentos.
        </p>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Benefit icon={<CalendarDays size={16} />} text="Calendário simples" />
          <Benefit icon={<Users size={16} />} text="Gestão de hóspedes" />
          <Benefit icon={<Coffee size={16} />} text="Café da manhã opcional" />
          <Benefit icon={<ShieldCheck size={16} />} text="Dados seguros" />
        </div>

        {/* Sign in button */}
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[var(--eco-border)] eco-surface hover:bg-[var(--eco-surface-alt)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin eco-muted" />
              <span className="eco-muted">Redirecionando...</span>
            </>
          ) : (
            <>
              <GoogleIcon />
              <span className="eco-text font-medium">Continuar com Google</span>
            </>
          )}
        </button>

        {/* Privacy note */}
        <p className="text-xs eco-muted text-center mt-4">
          Usamos sua conta Google apenas para identificação.
          <br />
          Nenhum dado é compartilhado com terceiros.
        </p>
      </div>
    </div>
  )
}

function Benefit({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg eco-surface-alt text-xs eco-text">
      <span className="eco-muted">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.826 32.91 29.28 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.84 1.154 7.957 3.043l5.657-5.657C34.676 6.053 29.627 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20c10.493 0 19-8.507 19-19 0-1.341-.138-2.651-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.814C14.297 16.053 18.76 12 24 12c3.059 0 5.84 1.154 7.957 3.043l5.657-5.657C34.676 6.053 29.627 4 24 4 15.317 4 7.961 9.137 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.142 0 9.81-1.969 13.357-5.18l-6.164-5.215C29.215 35.091 26.74 36 24 36c-5.254 0-9.81-3.402-11.416-8.102l-6.49 5.003C8.688 39.252 15.768 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.088 3.157-3.43 5.63-6.107 7.104l.001-.001 6.164 5.215C37.18 41.567 43 36.667 43 27c0-2.108-.289-4.007-.389-3.917z" />
    </svg>
  )
}