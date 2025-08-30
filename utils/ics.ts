import type { Reservation } from "@/core/entities";

function dt(dateISO: string): string {
  return dateISO.replace(/-/g, '') // YYYYMMDD
}
export function reservationToICS(res: Reservation): string {
  const uid = `res-${res.id}@motherreservations`
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z')
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MotherReservations//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}`,
    `DTSTART;VALUE=DATE:${dt(res.checkIn)}`,
    `DTEND;VALUE=DATE:${dt(res.checkOut)}`,
    `SUMMARY:Reservation · ${res.guestName} (${res.partySize})`,
    `DESCRIPTION:Total ${res.totalPrice} | Deposit ${res.depositDue} ${res.depositPaid ? "(paid)" : "(due)"} | Breakfast ${res.breakfastIncluded ? "yes" : "no"}${res.notes ? ` | Notes: ${res.notes}` : ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}