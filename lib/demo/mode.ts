// DEMO_MODE (ADR-0016): the public read-only showcase runs the same frontend
// with reads served from checked-in CSV fixtures instead of Supabase. The
// private app leaves the flag unset. This module is fs-free so it is safe to
// import from anywhere; the fixture provider (server-only) is loaded lazily.
import { DEFAULT_TIMEZONE } from "../dates";

/** True on the demo deployment (`DEMO_MODE=1`); routes server reads to fixtures. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "1";
}

/** Synthetic owner id stamped on every fixture row (no real user exists). */
export const DEMO_USER_ID = "00000000-0000-0000-0000-0000000000de";

/** Timezone the demo computes "today" in, since it has no app_settings row. */
export const DEMO_TIMEZONE = DEFAULT_TIMEZONE;
