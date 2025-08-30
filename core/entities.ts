export type Reservation = {
  id: string;
  guestName: string;
  phone?: string;
  email?: string;
  partySize: number;
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD
  breakfastIncluded: boolean;
  nightlyRate: number;
  breakfastPerPersonPerNight: number;
  totalNights: number;
  totalPrice: number;
  depositDue: number;
  depositPaid: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};