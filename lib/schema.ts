import { z } from 'zod';
import { normalizeBirthDate } from './birthdate';

// Accepts multiple formats, normalizes to DD/MM/YYYY for storage
const birthDateFlexible = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (s === '') return undefined;
  // Normalize to DD/MM/YYYY (returns undefined if invalid)
  return normalizeBirthDate(s);
}, z.union([
  z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/), // DD/MM/YYYY (canonical storage format)
  z.undefined(),
]));

// V2 booking status
const bookingStatusSchema = z.enum(["confirmed", "waiting", "rejected"]);

export const reservationInputSchema = z.object({
  // Core identity
  id: z.string().optional(),
  guestName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  partySize: z.coerce.number().int().min(1),

  // Dates
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  // Pricing
  breakfastIncluded: z.coerce.boolean(),
  nightlyRate: z.coerce.number().min(0),
  breakfastPerPersonPerNight: z.coerce.number().min(0),
  extraSpend: z.coerce.number().min(0).optional().default(0),
  manualLodgingEnabled: z.coerce.boolean().optional().default(false),
  manualLodgingTotal: z.coerce.number().min(0).optional(),

  // V1 payment
  depositPaid: z.coerce.boolean().default(false),
  notes: z.string().optional(),

  // Other
  birthDate: birthDateFlexible.optional(),

  // ============================================================
  // V2 fields (optional for backward compat)
  // ============================================================
  schemaVersion: z.literal(2).optional(),
  status: bookingStatusSchema.optional(),
  rooms: z.coerce.number().int().min(1).max(4).optional(),
  payment: z.record(z.unknown()).optional(),
  notesInternal: z.string().optional(),
  notesGuest: z.string().optional(),
}).passthrough(); // Preserve unknown keys for future expansion

export type ReservationInput = z.infer<typeof reservationInputSchema>;