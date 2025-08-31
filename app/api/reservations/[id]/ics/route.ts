import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { userKeyFromEmail } from '@/lib/user'
import { getJson } from '@/lib/s3'
import type { Reservation } from '@/core/entities'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = userKeyFromEmail(session.user.email)
  const key = `users/${userId}/reservations/${params.id}.json`

  const res = await getJson<Reservation>(key)
  if (!res) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ics =
    `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//HF//EN\r\nBEGIN:VEVENT\r\n` +
    `UID:${res.id}@hf\r\nDTSTART;VALUE=DATE:${res.checkIn.replaceAll('-', '')}\r\n` +
    `DTEND;VALUE=DATE:${res.checkOut.replaceAll('-', '')}\r\n` +
    `SUMMARY:${res.guestName} (${res.partySize})\r\nEND:VEVENT\r\nEND:VCALENDAR`

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename=reservation-${res.id}.ics`,
    },
  })
}