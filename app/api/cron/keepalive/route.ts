// Supabase keep-alive cron (ADR-0024; replaces .github/workflows/keepalive.yml).
// Supabase Free pauses a project idle for ~7 days, which takes the app offline.
// A Vercel Cron GETs this route daily; the single trivial DB read resets that
// timer. Daily (not weekly) leaves ~7x margin on the pause window, so one skipped
// run is harmless. A failed read best-effort pings the digest webhook so a broken
// keep-alive is never silent.
import { bearerMatches } from "@/lib/capture";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request): Promise<Response> {
  if (!bearerMatches(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "not authorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const { error } = await db.from("projects").select("id").limit(1);
  if (error) {
    await alertKeepaliveFailure(error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, at: new Date().toISOString() });
}

// Best-effort failure ping to the digest webhook (if configured); never throws —
// a dead webhook must not turn a keep-alive failure into an unhandled rejection.
async function alertKeepaliveFailure(message: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_DIGEST_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: `keep-alive db read failed: ${message}` }),
    });
  } catch {
    // swallow: alerting is best-effort, the 500 is the source of truth
  }
}
