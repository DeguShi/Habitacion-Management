import type { Reservation } from '@/core/entities'

function dt(dateISO: string): string {
  // YYYYMMDD format for all-day events (no replaceAll)
  return dateISO.replace(/-/g, '')
}

export function reservationToICS(res: Reservation): string {
  const uid = `res-${res.id}@motherreservations`
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MotherReservations//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dt(res.checkIn)}`,
    `DTEND;VALUE=DATE:${dt(res.checkOut)}`,
    `SUMMARY:Reserva · ${res.guestName} (${res.partySize})`,
    `DESCRIPTION:Total ${res.totalPrice} | Depósito ${res.depositDue} ${res.depositPaid ? '(pago)' : '(pendente)'} | Café ${res.breakfastIncluded ? 'sim' : 'não'}${res.notes ? ` | Obs: ${res.notes}` : ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}