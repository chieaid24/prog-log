// Request tests for the daily Throwback digest cron (PRD 3.4, 8): CRON_SECRET
// gate, silent empty-pool day, and exactly one webhook post whose content is
// the same date-seeded pick the web feed shows first.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { todayInTimeZone } from "@/lib/dates";
import { humanizeAge, pickThrowbacks } from "@/lib/throwbacks";
import type { ThrowbackItem } from "@/lib/types";

const { ADMIN, getOwnerThrowbackPool, getOwnerTimezone } = vi.hoisted(() => ({
  ADMIN: { admin: true },
  getOwnerThrowbackPool: vi.fn(),
  getOwnerTimezone: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ADMIN }));
vi.mock("@/lib/discord/owner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/discord/owner")>();
  return { ...actual, getOwnerThrowbackPool, getOwnerTimezone };
});

import { GET } from "@/app/api/cron/digest/route";

const CRON_SECRET = "c".repeat(64);
const WEBHOOK_URL = "https://discord.com/api/webhooks/123/abc";
const TIMEZONE = "America/Toronto";

function throwback(milestone: string, projectName: string, daysAgo: number): ThrowbackItem {
  return {
    entryId: `e-${milestone.replace(/\s+/g, "-")}`,
    milestone,
    entryDate: "2026-01-01",
    projectName,
    color: "#7c8cf8",
    daysAgo,
  };
}

const POOL = [
  throwback("shipped the heatmap", "Work", 120),
  throwback("first full conversation", "Turkish", 45),
  throwback("model beat the baseline", "AI-M", 400),
];

const fetchMock = vi.fn();

function get(bearer: string | null = CRON_SECRET): Promise<Response> {
  return GET(
    new Request("http://localhost/api/cron/digest", {
      headers: bearer === null ? {} : { authorization: `Bearer ${bearer}` },
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", CRON_SECRET);
  vi.stubEnv("DISCORD_DIGEST_WEBHOOK_URL", WEBHOOK_URL);
  vi.stubEnv("OWNER_USER_ID", "11111111-1111-1111-1111-111111111111");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  getOwnerTimezone.mockReset().mockResolvedValue(TIMEZONE);
  getOwnerThrowbackPool.mockReset().mockResolvedValue(POOL);
});

describe("auth gate", () => {
  it("401s a wrong cron secret without calling the webhook", async () => {
    const res = await get("d".repeat(64));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("401s a missing Authorization header", async () => {
    const res = await get(null);
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("digest", () => {
  it("stays silent on an empty Throwback pool: {sent:false}, no webhook call", async () => {
    getOwnerThrowbackPool.mockResolvedValue([]);
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts exactly one webhook message matching the date-seeded pick", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(WEBHOOK_URL);
    expect(init.method).toBe("POST");

    // The digest must be the same item the web feed shows first today.
    const today = todayInTimeZone(TIMEZONE);
    const expected = pickThrowbacks(POOL, today, 1)[0];
    const { content } = JSON.parse(init.body);
    expect(content).toContain(expected.milestone);
    expect(content).toContain(expected.projectName);
    expect(content).toContain(humanizeAge(expected.daysAgo));
    for (const other of POOL) {
      if (other.entryId !== expected.entryId) {
        expect(content).not.toContain(other.milestone);
      }
    }
  });

  it("surfaces a failing webhook as 502 {sent:false}", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    const res = await get();
    expect(res.status).toBe(502);
    expect((await res.json()).sent).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
