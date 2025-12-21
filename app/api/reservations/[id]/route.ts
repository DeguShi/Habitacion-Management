import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { userKeyFromEmail } from '@/lib/user'
import { updateReservation, deleteReservation } from '@/core/usecases'
import { getJson } from '@/lib/s3'

// allowlist logic, just the same
const allowedSet = new Set(
  (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
)
function isAllowed(email: string) {
  if (allowedSet.size === 0) return false
  return allowedSet.has(email.trim().toLowerCase())
}

// ID safety check - reject path traversal attempts
function isValidId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  // Only allow alphanumeric, hyphens, underscores
  return /^[\w-]+$/.test(id)
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = userKeyFromEmail(email)
  const { id } = params

  // Validate ID safety
  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    const key = `users/${userId}/reservations/${id}.json`
    const data = await getJson<Record<string, unknown>>(key)

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load' }, { status: 500 })
  }
}


export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAllowed(email)) return NextResponse.json({ error: 'Writes are restricted for this account' }, { status: 403 })

  const userId = userKeyFromEmail(email)

  try {
    const body = await req.json()
    const updated = await updateReservation(userId, params.id, body)
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Invalid payload' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAllowed(email)) return NextResponse.json({ error: 'Writes are restricted for this account' }, { status: 403 })

  const userId = userKeyFromEmail(email)

  try {
    await deleteReservation(userId, params.id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 400 })
  }
}