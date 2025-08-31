import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { userKeyFromEmail } from '@/lib/user'
import { createReservation, listReservations } from '@/core/usecases'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = userKeyFromEmail(session.user.email)
  const url = new URL(req.url)
  const month = url.searchParams.get('month') || undefined
  const items = await listReservations(userId, month)
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = userKeyFromEmail(session.user.email)

  const body = await req.json()
  try {
    const created = await createReservation(userId, body)
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid' }, { status: 400 })
  }
}