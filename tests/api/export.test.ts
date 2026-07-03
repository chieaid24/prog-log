import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EntryWithProject } from "@/lib/types";

const getUser = vi.fn();
const getAllEntries = vi.fn();
const getAllProjects = vi.fn();
const getUserTimezone = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

vi.mock("@/lib/queries", () => ({
  getAllEntries: (...args: unknown[]) => getAllEntries(...args),
  getAllProjects: (...args: unknown[]) => getAllProjects(...args),
  getUserTimezone: (...args: unknown[]) => getUserTimezone(...args),
}));

import { GET } from "@/app/api/export/route";

const ENTRY: EntryWithProject = {
  id: "e1",
  user_id: "u1",
  project_id: "p1",
  entry_date: "2026-07-01",
  time_spent: "large",
  milestone: "shipped v1",
  description: null,
  created_at: "2026-07-01T12:00:00Z",
  project: { id: "p1", name: "prog-log", color: "#7c8cf8", category: "coding", status: "active" },
};

function request(query = "") {
  return new NextRequest(`http://localhost/api/export${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  getAllEntries.mockResolvedValue([ENTRY]);
  getAllProjects.mockResolvedValue([]);
  getUserTimezone.mockResolvedValue("America/Toronto");
});

describe("GET /api/export", () => {
  it("rejects unauthenticated requests with 401 and fetches nothing", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(request("?format=csv"));
    expect(res.status).toBe(401);
    expect(getAllEntries).not.toHaveBeenCalled();
  });

  it("rejects an unknown format with 400", async () => {
    const res = await GET(request("?format=xml"));
    expect(res.status).toBe(400);
  });

  it("serves CSV as a download", async () => {
    const res = await GET(request("?format=csv"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toMatch(/attachment; filename="prog-log-.*\.csv"/);
    const body = await res.text();
    expect(body).toContain("entry_date,project,time_spent,milestone,description");
    expect(body).toContain("2026-07-01,prog-log,large,shipped v1,");
  });

  it("serves the versioned JSON envelope by default", async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.format).toBe("prog-log-export");
    expect(body.version).toBe(1);
    expect(body.timezone).toBe("America/Toronto");
    expect(body.entries).toEqual([
      {
        entry_date: "2026-07-01",
        project: "prog-log",
        time_spent: "large",
        milestone: "shipped v1",
        description: null,
      },
    ]);
  });
});
