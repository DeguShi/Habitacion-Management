'use client'

import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { CalendarDays, Users, Coffee, ShieldCheck } from 'lucide-react'

export default function SignInPage() {
  return (
    <div className="relative min-h-[calc(100vh-56px)] overflow-hidden eco-bg">
      {/* soft floral background */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#F6F1E7] via-[#F1E7D6] to-[#FFFCF6]" />
      <Petals />
      <Vines />

      <div className="max-w-6xl mx-auto px-4 py-10 grid lg:grid-cols-12 gap-8">
        {/* Left / hero */}
        <section className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
          <Image src="/logo-hab.png" alt="Habitación Familiar" width={120} height={120} className="rounded-xl shadow-sm mb-4" priority />
          <h1 className="text-3xl font-semibold">Bem-vinda, Lisiani <span aria-hidden>🌸</span></h1>

          <p className="text-gray-600 mt-3 max-w-xl">
            Centralize as reservas de uma noite, com número de pessoas, preço, depósito (50%) e café da manhã.
            Tudo salvo na nuvem para consultar de qualquer lugar.
          </p>

          {/* benefit icons */}
          <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-xl">
            <Benefit icon={<CalendarDays className="h-5 w-5" />} title="Calendário simples" text="Veja os dias e a lotação por cor." />
            <Benefit icon={<Users className="h-5 w-5" />} title="Focado no básico" text="Nome, pessoas, contato e observações." />
            <Benefit icon={<Coffee className="h-5 w-5" />} title="Café opcional" text="Valor por pessoa/noite somado ao total." />
            <Benefit icon={<ShieldCheck className="h-5 w-5" />} title="Seguro na nuvem" text="Acesso pelo Google, sem perder anotações." />
          </div>

          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="mt-8 btn-google"
            aria-label="Entrar com Google"
          >
            <span className="google-chip"><GoogleIcon /></span>
            <span>Entrar com Google</span>
          </button>

          <p className="text-xs text-gray-500 mt-3">
            Usamos sua conta Google apenas para identificar você. Nenhum dado é compartilhado com terceiros.
          </p>
        </section>

        {/* Right / how it works card */}
        <section className="lg:col-span-6">
          <div className="relative rounded-2xl eco-surface border border-[var(--eco-border)] shadow-sm p-6 overflow-hidden">
            <Corner className="left-0 top-0" rotate={0} />
            <Corner className="right-0 top-0" rotate={90} />
            <Corner className="left-0 bottom-0" rotate={270} />
            <Corner className="right-0 bottom-0" rotate={180} />

            <h2 className="font-semibold mb-3">Como funciona?</h2>
            <ol className="list-decimal ml-5 space-y-2 text-gray-700">
              <li>Escolha um dia no calendário.</li>
              <li>Cadastre o nome da família, nº de pessoas e se deseja café.</li>
              <li>O preço é calculado automaticamente — ou informe o total manualmente.</li>
              <li>Marque se o depósito (50%) foi pago.</li>
            </ol>

            <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
              <div className="font-medium text-emerald-800">Dica</div>
              <p className="text-emerald-900 text-sm">
                No calendário, as cores mostram a ocupação: amarelo (1 reserva), laranja (2) e vermelho (3 — lotado).
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/* small pieces */

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl eco-surface border border-[var(--eco-border)] p-3 text-left hover:shadow-sm transition">
      <div className="flex items-center gap-2 text-gray-800">
        <span className="h-8 w-8 grid place-items-center rounded-full bg-gray-100">{icon}</span>
        <span className="font-medium">{title}</span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{text}</p>
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

function Corner({ className, rotate = 0 }: { className?: string; rotate?: number }) {
  return (
    <svg className={`pointer-events-none absolute ${className}`} width="140" height="140" viewBox="0 0 140 140"
      style={{ transform: `rotate(${rotate}deg)` }}>
      <defs>
        <linearGradient id="lg" x1="0" x2="1">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="1" stopColor="#ecfccb" />
        </linearGradient>
      </defs>
      <g opacity="0.6">
        <circle cx="20" cy="20" r="16" fill="url(#lg)" stroke="#e5e7eb" />
        <circle cx="62" cy="10" r="8" fill="#fde68a" />
        <circle cx="100" cy="36" r="10" fill="#fed7aa" />
        <path d="M10 110 C40 90, 60 70, 110 60" stroke="#86efac" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/* background flourishes */
function Petals() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute left-10 top-16 h-6 w-6 rounded-full bg-rose-100" />
      <div className="absolute left-20 top-28 h-4 w-4 rounded-full bg-amber-100" />
      <div className="absolute right-24 top-24 h-8 w-8 rounded-full bg-amber-100" />
      <div className="absolute right-10 bottom-20 h-6 w-6 rounded-full bg-rose-100" />
    </div>
  )
}
function Vines() {
  return (
    <svg className="pointer-events-none absolute right-[-40px] top-24 -z-10 opacity-70" width="260" height="260" viewBox="0 0 200 200">
      <path d="M10 150 C60 120, 120 80, 190 70" stroke="#a7f3d0" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M10 170 C80 150, 120 120, 190 110" stroke="#bbf7d0" strokeWidth="8" fill="none" strokeLinecap="round" />
    </svg>
  )
}