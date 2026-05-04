import { formatInTimeZone } from "date-fns-tz";

export function getLocalDateString(timezone: string, at: Date = new Date()) {
  return formatInTimeZone(at, timezone, "yyyy-MM-dd");
}

/** Gregorian `yyyy-MM-dd` ± n days (labels already aligned with the user's local calendar). */
export function addCalendarDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return base.toISOString().slice(0, 10);
}

/** Last `n` calendar days including `endYmd` (newest first). */
export function lastNYmdDays(endYmd: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addCalendarDaysYmd(endYmd, -i));
}
