import { differenceInCalendarDays, parseISO } from "date-fns";

export function calcNights(a: string, b: string) {
  const n = differenceInCalendarDays(parseISO(b), parseISO(a));
  return Math.max(0, n);
}

export function calcTotal(
  nights: number,
  nightlyRate: number,
  breakfastIncluded: boolean,
  partySize: number,
  breakfastPerPersonPerNight: number,
  lodgingOverride?: number | null
) {
  const lodging = lodgingOverride ?? nights * partySize * nightlyRate;
  const breakfast = breakfastIncluded ? nights * partySize * breakfastPerPersonPerNight : 0;
  return Math.round((lodging + breakfast) * 100) / 100;
}