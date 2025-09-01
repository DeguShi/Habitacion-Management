import { v4 as uuid } from "uuid";
import { reservationInputSchema } from "@/lib/schema";
import { calcNights, calcTotal } from "@/lib/pricing";
import type { Reservation } from "./entities";
import { getJson, putJson, listReservationKeys, deleteKey } from "@/lib/s3";

function prefix(userId: string) {
  return `users/${userId}/reservations/`;
}

// Add N (can be negative) days to an ISO date (YYYY-MM-DD)
function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Normalize various BR-friendly birth date inputs to ISO (YYYY-MM-DD).
 * Accepts:
 *   - "DD/MM/YYYY"
 *   - "DD-MM-YYYY"
 *   - "DDMMYYYY" (8 digits)
 *   - empty / undefined → returns undefined
 */
function normalizeBirthDate(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  let s = String(raw).trim();
  if (!s) return undefined;

  // already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or DD-MM-YYYY
  let m = /^(\d{2})[\/-](\d{2})[\/-](\d{4})$/.exec(s);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }

  // DDMMYYYY (8 digits)
  if (/^\d{8}$/.test(s)) {
    const dd = s.slice(0, 2);
    const mm = s.slice(2, 4);
    const yyyy = s.slice(4, 8);
    return `${yyyy}-${mm}-${dd}`;
  }

  return undefined;
}

export async function createReservation(
  userId: string,
  input: unknown
): Promise<Reservation> {
  const data = reservationInputSchema.parse(input);
  const id = data.id ?? uuid();
  const now = new Date().toISOString();

  const birthDateISO = normalizeBirthDate((input as any)?.birthDate);

  const checkOut = data.checkOut ?? addDaysISO(data.checkIn, 1);
  const nights = calcNights(data.checkIn, checkOut);

  const total = calcTotal(
    nights,
    data.nightlyRate,
    data.breakfastIncluded,
    data.partySize,
    data.breakfastPerPersonPerNight,
    data.manualLodgingEnabled ? (data.manualLodgingTotal ?? 0) : null,
    data.extraSpend ?? 0
  );

  const reservation: Reservation = {
    id,
    guestName: data.guestName,
    phone: data.phone || undefined,
    email: data.email || undefined,
    partySize: data.partySize,
    checkIn: data.checkIn,
    checkOut,
    breakfastIncluded: data.breakfastIncluded,
    nightlyRate: data.nightlyRate,
    breakfastPerPersonPerNight: data.breakfastPerPersonPerNight,

    manualLodgingEnabled: data.manualLodgingEnabled ?? false,
    manualLodgingTotal: data.manualLodgingEnabled ? (data.manualLodgingTotal ?? 0) : undefined,

    extraSpend: data.extraSpend ?? 0,
    birthDate: data.birthDate || undefined,
    // birthDate: birthDateISO,

    totalNights: nights,
    totalPrice: total,
    depositDue: Math.round(total * 0.5 * 100) / 100,
    depositPaid: data.depositPaid ?? false,
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
  };

  await putJson(`${prefix(userId)}${id}.json`, reservation);
  return reservation;
}

export async function updateReservation(
  userId: string,
  id: string,
  input: unknown
): Promise<Reservation> {
  const key = `${prefix(userId)}${id}.json`;
  const existing = await getJson<Reservation>(key);
  if (!existing) throw new Error("Reservation not found");

  const partial: Record<string, unknown> =
    typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};

  const merged = reservationInputSchema.parse({ ...existing, ...partial, id });

  // normalize birth date only if explicitly provided; otherwise keep existing
  const incomingBirth = (partial as any)?.birthDate;
  const birthDateISO =
    incomingBirth !== undefined ? normalizeBirthDate(incomingBirth) : (existing as any).birthDate;

  const checkOut = merged.checkOut ?? addDaysISO(merged.checkIn, 1);
  const nights = calcNights(merged.checkIn, checkOut);

  const total = calcTotal(
    nights,
    merged.nightlyRate,
    merged.breakfastIncluded,
    merged.partySize,
    merged.breakfastPerPersonPerNight,
    merged.manualLodgingEnabled ? (merged.manualLodgingTotal ?? 0) : null,
    merged.extraSpend ?? 0
  );

  const updated: Reservation = {
    ...existing,
    ...merged,
    checkOut,

    manualLodgingEnabled: merged.manualLodgingEnabled ?? false,
    manualLodgingTotal: merged.manualLodgingEnabled ? (merged.manualLodgingTotal ?? 0) : undefined,

    extraSpend: merged.extraSpend ?? 0,

    // New (optional)
    birthDate: birthDateISO,

    totalNights: nights,
    totalPrice: total,
    depositDue: Math.round(total * 0.5 * 100) / 100,
    updatedAt: new Date().toISOString(),
  };

  await putJson(key, updated);
  return updated;
}

export async function deleteReservation(userId: string, id: string): Promise<void> {
  await deleteKey(`${prefix(userId)}${id}.json`);
}

export async function listReservations(
  userId: string,
  month?: string
): Promise<Reservation[]> {
  const keys = await listReservationKeys(prefix(userId));
  const items: Reservation[] = [];
  for (const key of keys) {
    const r = await getJson<Reservation>(key);
    if (r) items.push(r);
  }
  items.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  if (month) return items.filter((r) => r.checkIn.startsWith(month) || r.checkOut.startsWith(month));
  return items;
}