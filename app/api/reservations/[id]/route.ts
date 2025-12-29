import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { userKeyFromEmail } from '@/lib/user'
import { updateReservation, deleteReservation } from '@/core/usecases'
import { getJson } from '@/lib/s3'
import { DEMO_RESERVATIONS } from '@/lib/demo/fixture_reservations_v2'

// allowlist logic
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

  // Demo mode for non-admin users: find in fixture
  if (!email || !isAllowed(email)) {
    const record = DEMO_RESERVATIONS.find(r => r.id === params.id)
    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const response = NextResponse.json(record)
    // Add ETag for demo records too
    if (record.updatedAt) {
      response.headers.set('ETag', `"${record.updatedAt}"`)
    }
    return response
  }

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

    const response = NextResponse.json(data)

    // Add ETag header for optimistic concurrency (uses updatedAt as version)
    const updatedAt = data.updatedAt as string
    if (updatedAt) {
      response.headers.set('ETag', `"${updatedAt}"`)
    }

    return response
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load' }, { status: 500 })
  }
}


export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Non-admin users get demo mode (read-only)
  if (!isAllowed(email)) return NextResponse.json({ error: 'Demo mode: read-only' }, { status: 403 })

  const userId = userKeyFromEmail(email)
  const key = `users/${userId}/reservations/${params.id}.json`

  // Check optimistic concurrency via If-Match header
  const ifMatch = req.headers.get('If-Match')
  if (ifMatch) {
    const existing = await getJson<Record<string, unknown>>(key)
    if (existing) {
      // Parse If-Match header (strip quotes)
      const expectedVersion = ifMatch.replace(/^"|"$/g, '')
      const currentVersion = (existing.updatedAt as string) || ''

      if (expectedVersion !== currentVersion) {
        // Conflict: client's version is stale
        return NextResponse.json(
          { error: 'Conflict', current: existing },
          { status: 409 }
        )
      }
    }
  }

  try {
    const body = await req.json()
    const updated = await updateReservation(userId, params.id, body)

    const response = NextResponse.json(updated)
    // Add ETag header to response
    if (updated.updatedAt) {
      response.headers.set('ETag', `"${updated.updatedAt}"`)
    }
    return response
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Invalid payload' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Non-admin users get demo mode (read-only)
  if (!isAllowed(email)) return NextResponse.json({ error: 'Demo mode: read-only' }, { status: 403 })

  const userId = userKeyFromEmail(email)
  const key = `users/${userId}/reservations/${params.id}.json`

  // Check optimistic concurrency via If-Match header
  const ifMatch = req.headers.get('If-Match')
  if (ifMatch) {
    const existing = await getJson<Record<string, unknown>>(key)
    if (existing) {
      // Parse If-Match header (strip quotes)
      const expectedVersion = ifMatch.replace(/^"|"$/g, '')
      const currentVersion = (existing.updatedAt as string) || ''

      if (expectedVersion !== currentVersion) {
        // Conflict: client's version is stale
        return NextResponse.json(
          { error: 'Conflict', current: existing },
          { status: 409 }
        )
      }
    }
  }

  try {
    await deleteReservation(userId, params.id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 400 })
  }
}