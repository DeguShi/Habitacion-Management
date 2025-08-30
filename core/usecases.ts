// core/usecases.ts
import { v4 as uuid } from "uuid";
import { reservationInputSchema } from "@/lib/schema";
import { calcNights, calcTotal } from "@/lib/pricing";
import type { Reservation } from "./entities";
import { getJson, putJson, listReservationKeys, deleteKey } from "@/lib/s3";

function prefix(userId: string) {
  return `users/${userId}/reservations/`;
}

// Add N days to an ISO date (YYYY-MM-DD)
function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Extract a manual “lodging per night (group)” override from any client variant. */
function getLodgingOverride(input: unknown): number | null {
  const any = input as any;
  if (typeof any?.lodgingOverride === "number") return any.lodgingOverride;
  if (any?.manualLodgingEnabled && typeof any?.manualLodgingTotal === "number") {
    return any.manualLodgingTotal;
  }
  return null;
}

export async function createReservation(
  userId: string,
  input: unknown
): Promise<Reservation> {
  // Validate known fields; unknown keys are ignored by zod by default
  const data = reservationInputSchema.parse(input);
  const id = data.id ?? uuid();
  const now = new Date().toISOString();

  const checkOut = data.checkOut ?? addDaysISO(data.checkIn, 1); // single-night default
  const nights = calcNights(data.checkIn, checkOut);

  const total = calcTotal(
    nights,
    data.nightlyRate,
    data.breakfastIncluded,
    data.partySize,
    data.breakfastPerPersonPerNight,
    getLodgingOverride(input) // <- optional manual total per night (group)
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

  // guard unknown -> object before spreading
  const partial: Record<string, unknown> =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};

  // Merge with existing, then validate
  const mergedInput = { ...existing, ...partial, id };
  const merged = reservationInputSchema.parse(mergedInput);

  const checkOut = merged.checkOut ?? addDaysISO(merged.checkIn, 1);
  const nights = calcNights(merged.checkIn, checkOut);

  const total = calcTotal(
    nights,
    merged.nightlyRate,
    merged.breakfastIncluded,
    merged.partySize,
    merged.breakfastPerPersonPerNight,
    getLodgingOverride(mergedInput) // respect manual value if present
  );

  const updated: Reservation = {
    ...existing,
    ...merged,
    checkOut,
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

  // month format: YYYY-MM
  if (month) return items.filter((r) => r.checkIn.startsWith(month) || r.checkOut.startsWith(month));
  return items;
}