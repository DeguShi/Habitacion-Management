export function calcNights(checkInISO: string, checkOutISO: string): number {
  const a = new Date(checkInISO);
  const b = new Date(checkOutISO);
  const diff = Math.round((+b - +a) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function calcTotal(
  nights: number,
  nightlyRate: number,
  breakfastIncluded: boolean,
  partySize: number,
  breakfastPerPersonPerNight: number,
  lodgingOverride: number | null = null // NEW
): number {
  const lodging =
    lodgingOverride != null
      ? Number(lodgingOverride)
      : nights * nightlyRate * partySize;

  const breakfast = breakfastIncluded
    ? nights * partySize * breakfastPerPersonPerNight
    : 0;

  return round2(lodging + breakfast);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}