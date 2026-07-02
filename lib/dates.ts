// Date helpers. All "today" math goes through the user's stored timezone
// (ADR-0004) — never the server's clock zone, never UTC directly.

export const DEFAULT_TIMEZONE = "America/Toronto";

/** Calendar date (YYYY-MM-DD) for an instant in an IANA timezone. */
export function dateInTimeZone(timeZone: string, instant: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Today's calendar date in the user's timezone. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  return dateInTimeZone(timeZone, now);
}

/** Parse an ISO date (YYYY-MM-DD) to a UTC-noon Date — immune to DST edges in date math. */
export function parseISODate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

/** Format a Date's UTC calendar day as ISO (inverse of parseISODate). */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/** Whole days from `from` to `to` (both ISO dates); positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** First day of an ISO date's month. */
export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Last day of an ISO date's month. */
export function endOfMonth(iso: string): string {
  const d = parseISODate(startOfMonth(iso));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return toISODate(d);
}

/** Shift an ISO date by whole months, clamping to the target month's length. */
export function addMonths(iso: string, months: number): string {
  const d = parseISODate(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return toISODate(d);
}

/** 0 = Monday ... 6 = Sunday, for an ISO date. */
export function weekdayMondayFirst(iso: string): number {
  return (parseISODate(iso).getUTCDay() + 6) % 7;
}

/** Human month title, e.g. "July 2026". */
export function monthTitle(isoMonthStart: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(parseISODate(isoMonthStart));
}

/** Human date, e.g. "July 2, 2026". */
export function humanDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseISODate(iso));
}
