import { v4 as uuid } from "uuid";
import { reservationInputSchema } from "@/lib/schema";
import { calcNights, calcTotal } from "@/lib/pricing";
import { normalizeBirthDate } from "@/lib/birthdate";
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

// normalizeBirthDate is now imported from @/lib/birthdate

export async function createReservation(
  userId: string,
  input: unknown
): Promise<Record<string, unknown>> {
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

  // Clamp rooms to [1,4] if present
  const rooms = data.rooms != null ? Math.min(4, Math.max(1, data.rooms)) : undefined;

  // Merge all validated data with computed fields
  // This preserves v2 fields (status, rooms, payment, etc.) and unknown keys
  const reservation: Record<string, unknown> = {
    ...data,                          // All validated fields including v2
    id,
    checkOut,
    birthDate: birthDateISO,
    rooms,                            // Clamped rooms (or undefined)
    totalNights: nights,
    totalPrice: total,
    depositDue: Math.round(total * 0.5 * 100) / 100,
    createdAt: now,
    updatedAt: now,
  };

  // Clean up undefined values to keep JSON clean
  for (const key of Object.keys(reservation)) {
    if (reservation[key] === undefined) {
      delete reservation[key];
    }
  }

  await putJson(`${prefix(userId)}${id}.json`, reservation);
  return reservation;
}

export async function updateReservation(
  userId: string,
  id: string,
  input: unknown
): Promise<Record<string, unknown>> {
  const key = `${prefix(userId)}${id}.json`;

  // Load existing as raw object to preserve ALL keys
  const existingRaw = await getJson<Record<string, unknown>>(key);
  if (!existingRaw) throw new Error("Reservation not found");

  const partial: Record<string, unknown> =
    typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};

  // Validate merged input (schema now includes v2 fields + passthrough)
  const validated = reservationInputSchema.parse({ ...existingRaw, ...partial, id });

  // Normalize birth date only if explicitly provided; otherwise keep existing
  const incomingBirth = partial?.birthDate;
  const birthDateISO =
    incomingBirth !== undefined ? normalizeBirthDate(incomingBirth) : existingRaw.birthDate;

  const checkOut = validated.checkOut ?? addDaysISO(validated.checkIn, 1);
  const nights = calcNights(validated.checkIn, checkOut);

  const total = calcTotal(
    nights,
    validated.nightlyRate,
    validated.breakfastIncluded,
    validated.partySize,
    validated.breakfastPerPersonPerNight,
    validated.manualLodgingEnabled ? (validated.manualLodgingTotal ?? 0) : null,
    validated.extraSpend ?? 0
  );

  // Clamp rooms to [1,4] if present
  const rooms = validated.rooms != null
    ? Math.min(4, Math.max(1, validated.rooms))
    : existingRaw.rooms;

  // Merge: existingRaw (preserves all keys) → validated → computed fields
  const updated: Record<string, unknown> = {
    ...existingRaw,           // Preserves _importMeta, unknown keys, etc.
    ...validated,             // Validated input (includes v2 fields)
    id,
    checkOut,
    birthDate: birthDateISO,
    rooms,
    totalNights: nights,
    totalPrice: total,
    depositDue: Math.round(total * 0.5 * 100) / 100,
    updatedAt: new Date().toISOString(),
  };

  // Clean up undefined values to keep JSON clean
  for (const k of Object.keys(updated)) {
    if (updated[k] === undefined) {
      delete updated[k];
    }
  }

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

  // Fetch all reservations in parallel (was sequential, causing ~7s delay)
  const results = await Promise.all(keys.map(key => getJson<Reservation>(key)));
  const items = results.filter((r): r is Reservation => r !== null);

  items.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  if (month) return items.filter((r) => r.checkIn.startsWith(month) || r.checkOut.startsWith(month));
  return items;
}