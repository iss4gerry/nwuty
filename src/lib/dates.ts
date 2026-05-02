import { formatInTimeZone } from "date-fns-tz";

export function getLocalDateString(timezone: string, at: Date = new Date()) {
  return formatInTimeZone(at, timezone, "yyyy-MM-dd");
}
