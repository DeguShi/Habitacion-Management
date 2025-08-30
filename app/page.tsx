// app/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import ClientShell from '@/app/(ui)/ClientShell'
import { redirect } from 'next/navigation'

export default async function Page() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/sign-in')
  return <ClientShell />
}