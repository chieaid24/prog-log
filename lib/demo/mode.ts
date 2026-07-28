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

/** Unobtrusive note the UI shows when a write is attempted in the demo. */
export const DEMO_WRITE_NOTE = "Demo mode - changes aren't saved.";

/**
 * The sentinel every write path returns in DEMO_MODE instead of touching the
 * database (ADR-0016). The `demo` discriminant lets the client tell a no-op
 * apart from a real failure and show DEMO_WRITE_NOTE unobtrusively.
 */
export type DemoWriteResult = { ok: false; demo: true; error: string };

/** Build the no-op write sentinel (ADR-0016). */
export function demoWriteResult(): DemoWriteResult {
  return { ok: false, demo: true, error: DEMO_WRITE_NOTE };
}

/** Client guard: did a write no-op because the app is in demo mode? */
export function isDemoNotice(result: unknown): result is DemoWriteResult {
  return (
    typeof result === "object" &&
    result !== null &&
    (result as { ok?: unknown }).ok === false &&
    (result as { demo?: unknown }).demo === true
  );
}
