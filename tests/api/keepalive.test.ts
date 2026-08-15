// Request tests for the Supabase keep-alive cron (ADR-0024): CRON_SECRET gate,
// exactly one trivial DB read on success, and a best-effort webhook alert on a
// failed read.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { ADMIN, from, select, limit } = vi.hoisted(() => {
  const limit = vi.fn();
  const select = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ select }));
  return { ADMIN: { from }, from, select, limit };
});

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ADMIN }));

import { GET } from "@/app/api/cron/keepalive/route";

const CRON_SECRET = "c".repeat(64);
const WEBHOOK_URL = "https://discord.com/api/webhooks/123/abc";

const fetchMock = vi.fn();

function get(bearer: string | null = CRON_SECRET): Promise<Response> {
  return GET(
    new Request("http://localhost/api/cron/keepalive", {
      headers: bearer === null ? {} : { authorization: `Bearer ${bearer}` },
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", CRON_SECRET);
  vi.stubEnv("DISCORD_DIGEST_WEBHOOK_URL", WEBHOOK_URL);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  from.mockClear();
  select.mockClear();
  limit.mockReset().mockResolvedValue({ error: null });
});

describe("auth gate", () => {
  it("401s a wrong cron secret without touching the db", async () => {
    const res = await get("d".repeat(64));
    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("401s a missing Authorization header without touching the db", async () => {
    const res = await get(null);
    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });
});

describe("keepalive", () => {
  it("200s and runs exactly one trivial projects read on a good secret", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("projects");
    expect(limit).toHaveBeenCalledWith(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("500s and pings the digest webhook when the db read fails", async () => {
    limit.mockResolvedValue({ error: { message: "project is paused" } });
    const res = await get();
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(WEBHOOK_URL);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).content).toContain("project is paused");
  });

  it("still 500s (no throw) when no alert webhook is configured", async () => {
    vi.stubEnv("DISCORD_DIGEST_WEBHOOK_URL", "");
    limit.mockResolvedValue({ error: { message: "boom" } });
    const res = await get();
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
