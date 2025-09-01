import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { userKeyFromEmail } from '@/lib/user'
import { createReservation, listReservations } from '@/core/usecases'

const allowedSet = new Set(
  (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
)

function isAllowed(email: string) {
  // deny by default
  if (allowedSet.size === 0) return false
  return allowedSet.has(email.trim().toLowerCase())
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = userKeyFromEmail(email)
  const url = new URL(req.url)
  const month = url.searchParams.get('month') || undefined

  const items = await listReservations(userId, month)
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAllowed(email)) {
    return NextResponse.json({ error: 'Writes are restricted for this account' }, { status: 403 })
  }

  const userId = userKeyFromEmail(email)

  try {
    const body = await req.json()
    const created = await createReservation(userId, body)
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Invalid payload' }, { status: 400 })
  }
}