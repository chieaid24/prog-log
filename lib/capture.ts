// Shared bearer-secret check for the capture endpoints (Apple Shortcut
// ingest, cron digest). Constant-time comparison so the secret cannot be
// recovered byte-by-byte from response timing.
import { timingSafeEqual } from "node:crypto";

/**
 * True only when the Authorization header is exactly `Bearer <secret>`.
 * Fails closed on a missing header, wrong scheme, or unset secret; the
 * length check leaks only the secret's length, never its content.
 */
export function bearerMatches(
  authorization: string | null,
  secret: string | undefined,
): boolean {
  if (!authorization || !secret || !authorization.startsWith("Bearer ")) return false;
  const presented = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return presented.length === expected.length && timingSafeEqual(presented, expected);
}
