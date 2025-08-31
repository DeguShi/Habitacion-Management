import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { userKeyFromEmail } from '@/lib/user'
import { getJson } from '@/lib/s3'
import { reservationToICS } from '@/utils/ics'
import type { Reservation } from '@/core/entities'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = userKeyFromEmail(email)
  const key = `users/${userId}/reservations/${params.id}.json`

  const resv = await getJson<Reservation>(key)
  if (!resv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ics = reservationToICS(resv)
  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename=reservation-${resv.id}.ics`,
    },
  })
}