// Daily Throwback digest (PRD 3.4, 8; ADR-0002). Vercel Cron GETs this route
// once a day; it posts the day's top Throwback to a Discord channel webhook.
// The pick is pickThrowbacks(pool, today, 1)[0] — the same date-seeded pick
// as the web feed's first card, so page and digest always agree. An empty
// pool means a silent day: {sent:false}, no webhook call.
import { bearerMatches } from "@/lib/capture";
import { todayInTimeZone } from "@/lib/dates";
import { getOwnerThrowbackPool, getOwnerTimezone } from "@/lib/discord/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { humanizeAge, pickThrowbacks } from "@/lib/throwbacks";

export async function GET(req: Request): Promise<Response> {
  if (!bearerMatches(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "not authorized" }, { status: 401 });
  }

  const webhookUrl = process.env.DISCORD_DIGEST_WEBHOOK_URL;
  if (!webhookUrl) {
    return Response.json(
      { sent: false, error: "DISCORD_DIGEST_WEBHOOK_URL is not set" },
      { status: 500 },
    );
  }

  const db = createAdminClient();
  const ownerId = process.env.OWNER_USER_ID ?? "";
  const timezone = await getOwnerTimezone(db, ownerId);
  const today = todayInTimeZone(timezone);
  const pool = await getOwnerThrowbackPool(db, ownerId, today);

  const [pick] = pickThrowbacks(pool, today, 1);
  if (!pick) return Response.json({ sent: false });

  const content = `**${humanizeAge(pick.daysAgo)}** - ${pick.projectName}: ${pick.milestone}`;
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    return Response.json(
      { sent: false, error: `webhook responded ${res.status}` },
      { status: 502 },
    );
  }

  return Response.json({ sent: true });
}
