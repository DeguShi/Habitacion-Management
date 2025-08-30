// lib/pricing.ts
export function calcNights(checkInISO: string, checkOutISO: string): number {
  const a = new Date(checkInISO)
  const b = new Date(checkOutISO)
  const ms = b.getTime() - a.getTime()
  const nights = Math.round(ms / (1000 * 60 * 60 * 24))
  return Math.max(0, nights)
}

/**
 * If `lodgingOverride` is provided (manual total), it replaces the lodging formula.
 * Otherwise: lodging = nights * nightlyPerPerson * partySize
 */
export function calcTotal(
  nights: number,
  nightlyPerPerson: number,
  breakfastIncluded: boolean,
  partySize: number,
  breakfastPerPersonPerNight: number,
  lodgingOverride: number | null | undefined = null
): number {
  const lodging = lodgingOverride != null
    ? lodgingOverride
    : nights * nightlyPerPerson * partySize

  const breakfast = breakfastIncluded
    ? nights * partySize * breakfastPerPersonPerNight
    : 0

  return Math.round((lodging + breakfast) * 100) / 100
}