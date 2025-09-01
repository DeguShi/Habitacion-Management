import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { userKeyFromEmail } from '@/lib/user'
import { getJson } from '@/lib/s3'
import type { Reservation } from '@/core/entities'

function dt(dateISO: string) {
  return dateISO.replace(/-/g, '')
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = userKeyFromEmail(email)
  const key = `users/${userId}/reservations/${params.id}.json`
  const res = await getJson<Reservation>(key)
  if (!res) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ics =
    'BEGIN:VCALENDAR\r\n' +
    'VERSION:2.0\r\n' +
    'PRODID:-//Habitacion Familiar//EN\r\n' +
    'BEGIN:VEVENT\r\n' +
    `UID:${res.id}@hf\r\n` +
    `DTSTART;VALUE=DATE:${dt(res.checkIn)}\r\n` +
    `DTEND;VALUE=DATE:${dt(res.checkOut)}\r\n` +
    `SUMMARY:${res.guestName} (${res.partySize})\r\n` +
    'END:VEVENT\r\n' +
    'END:VCALENDAR'

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename=reservation-${res.id}.ics`,
    },
  })
}