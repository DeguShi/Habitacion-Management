import { z } from 'zod';

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

  manualLodgingEnabled: z.coerce.boolean().optional().default(false),
  manualLodgingTotal: z.coerce.number().min(0).optional(),

  depositPaid: z.coerce.boolean().default(false),
  notes: z.string().optional(),
});

export type ReservationInput = z.infer<typeof reservationInputSchema>;