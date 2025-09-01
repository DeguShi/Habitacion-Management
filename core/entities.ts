export type Reservation = {
  id: string;
  guestName: string;
  phone?: string;
  email?: string;
  partySize: number;

  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD

  breakfastIncluded: boolean;
  nightlyRate: number;                    // per person / night
  breakfastPerPersonPerNight: number;     // per person / night

  manualLodgingEnabled?: boolean;
  manualLodgingTotal?: number;

  // Flat add-on not multiplied by nights/people (Consumo extra)
  extraSpend?: number;

  totalNights: number;
  totalPrice: number;
  depositDue: number;
  depositPaid: boolean;
  notes?: string;

  createdAt: string; // ISO
  updatedAt: string; // ISO
};