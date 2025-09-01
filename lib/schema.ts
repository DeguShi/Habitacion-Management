import { z } from 'zod';

const birthDateFlexible = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (s === '') return undefined;
  return s;
}, z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),     // ISO: YYYY-MM-DD
  z.string().regex(/^\d{2}[\/-]\d{2}[\/-]\d{4}$/), // DD/MM/YYYY or DD-MM-YYYY
  z.string().regex(/^\d{8}$/),                 // DDMMYYYY (digits only)
  z.undefined(),
]));

export const reservationInputSchema = z.object({
  id: z.string().optional(),
  guestName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  partySize: z.coerce.number().int().min(1),

  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  breakfastIncluded: z.coerce.boolean(),
  nightlyRate: z.coerce.number().min(0),
  breakfastPerPersonPerNight: z.coerce.number().min(0),

  extraSpend: z.coerce.number().min(0).optional().default(0),

  manualLodgingEnabled: z.coerce.boolean().optional().default(false),
  manualLodgingTotal: z.coerce.number().min(0).optional(),

  depositPaid: z.coerce.boolean().default(false),
  notes: z.string().optional(),

  birthDate: birthDateFlexible.optional(),
});

export type ReservationInput = z.infer<typeof reservationInputSchema>;