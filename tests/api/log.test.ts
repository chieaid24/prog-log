// Request tests for the Apple Shortcut ingest (PRD 4.2): bearer-secret gate,
// never-guess project resolution, and the shared upsert write path — with
// the write asserted absent on every rejection.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bearerMatches } from "@/lib/capture";
import type { Project } from "@/lib/types";

const { ADMIN, upsertEntry, getOwnerActiveProjects } = vi.hoisted(() => ({
  ADMIN: { admin: true },
  upsertEntry: vi.fn(),
  getOwnerActiveProjects: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ADMIN }));
vi.mock("@/lib/entries", () => ({ upsertEntry }));
vi.mock("@/lib/discord/owner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/discord/owner")>();
  return { ...actual, getOwnerActiveProjects };
});

import { POST } from "@/app/api/log/route";

const SECRET = "a".repeat(64);
const OWNER_USER_ID = "11111111-1111-1111-1111-111111111111";

function project(name: string): Project {
  return {
    id: `id-${name.toLowerCase()}`,
    user_id: OWNER_USER_ID,
    name,
    category: null,
    status: "active",
    color: "#7c8cf8",
    started: null,
    description: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

const PROJECTS = [project("AI-M"), project("Turkish"), project("Work")];

function post(body: unknown, bearer: string | null = SECRET): Promise<Response> {
  return POST(
    new Request("http://localhost/api/log", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(bearer === null ? {} : { authorization: `Bearer ${bearer}` }),
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("SHORTCUT_SECRET", SECRET);
  vi.stubEnv("OWNER_USER_ID", OWNER_USER_ID);
  upsertEntry.mockReset().mockResolvedValue({ id: "e1", entry_date: "2026-07-02" });
  getOwnerActiveProjects.mockReset().mockResolvedValue(PROJECTS);
});

describe("bearerMatches", () => {
  it("accepts only the exact Bearer secret", () => {
    expect(bearerMatches(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(bearerMatches(`Bearer ${"b".repeat(64)}`, SECRET)).toBe(false);
    expect(bearerMatches(`Bearer ${SECRET.slice(0, 63)}`, SECRET)).toBe(false);
    expect(bearerMatches(SECRET, SECRET)).toBe(false); // no scheme
    expect(bearerMatches(null, SECRET)).toBe(false);
    expect(bearerMatches(`Bearer ${SECRET}`, undefined)).toBe(false);
    expect(bearerMatches("Bearer ", "")).toBe(false);
  });
});

describe("auth gate", () => {
  it("401s a wrong bearer secret without writing", async () => {
    const res = await post({ project: "Work", time: "small" }, "b".repeat(64));
    expect(res.status).toBe(401);
    expect(upsertEntry).not.toHaveBeenCalled();
  });

  it("401s a missing Authorization header without writing", async () => {
    const res = await post({ project: "Work", time: "small" }, null);
    expect(res.status).toBe(401);
    expect(upsertEntry).not.toHaveBeenCalled();
  });
});

describe("valid capture", () => {
  it("resolves an exact case-insensitive match and upserts as the owner", async () => {
    const res = await post({
      project: "work",
      time: "large",
      milestone: "shipped the shortcut",
    });
    expect(res.status).toBe(200);
    expect(upsertEntry).toHaveBeenCalledTimes(1);
    expect(upsertEntry).toHaveBeenCalledWith(ADMIN, {
      projectId: "id-work",
      timeSpent: "large",
      milestone: "shipped the shortcut",
      description: null,
      userId: OWNER_USER_ID,
    });
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.message).toBe("logged Work - large");
  });
});

describe("rejections", () => {
  it("404s an unresolvable project with a did-you-mean hint and no write", async () => {
    const res = await post({ project: "turk", time: "small" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: 'no single active project matches "turk". did you mean: Turkish?',
    });
    expect(upsertEntry).not.toHaveBeenCalled();
  });

  it("400s an invalid time value with no write", async () => {
    const res = await post({ project: "Work", time: "huge" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('"huge" is not a time commitment');
    expect(upsertEntry).not.toHaveBeenCalled();
  });

  it("400s a missing project", async () => {
    const res = await post({ time: "small" });
    expect(res.status).toBe(400);
    expect(upsertEntry).not.toHaveBeenCalled();
  });

  it("400s a non-json body", async () => {
    const res = await post("not json");
    expect(res.status).toBe(400);
    expect(upsertEntry).not.toHaveBeenCalled();
  });
});
