// Unit tests for captureLog, the shared capture pipeline behind Discord /log
// and the Apple Shortcut (ADR-0002): owner-scoped resolution that never
// guesses (PRD 4.1), alias sugar (ADR-0010), and the single shared write
// path upsertEntry (ADR-0001) — with the write asserted absent on rejection.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureLog } from "@/lib/capture";
import type { Db } from "@/lib/queries";
import type { Project, ProjectAlias } from "@/lib/types";

const { upsertEntry, getOwnerActiveProjects, getOwnerAliases } = vi.hoisted(() => ({
  upsertEntry: vi.fn(),
  getOwnerActiveProjects: vi.fn(),
  getOwnerAliases: vi.fn(),
}));

vi.mock("@/lib/entries", () => ({ upsertEntry }));
vi.mock("@/lib/discord/owner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/discord/owner")>();
  return { ...actual, getOwnerActiveProjects, getOwnerAliases };
});

const DB = { db: true } as unknown as Db;
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

function aliasRow(text: string, projectId: string): ProjectAlias {
  return {
    id: `al-${text}`,
    user_id: OWNER_USER_ID,
    project_id: projectId,
    alias: text,
    created_at: "2026-01-01T00:00:00Z",
  };
}

function capture(rawProject: string, overrides: { milestone?: string | null } = {}) {
  return captureLog(DB, {
    ownerId: OWNER_USER_ID,
    rawProject,
    timeSpent: "small",
    milestone: overrides.milestone ?? null,
    description: null,
  });
}

beforeEach(() => {
  upsertEntry.mockReset().mockResolvedValue({ id: "e1", entry_date: "2026-07-02" });
  getOwnerActiveProjects.mockReset().mockResolvedValue(PROJECTS);
  getOwnerAliases.mockReset().mockResolvedValue([]);
});

describe("captureLog", () => {
  it("logs an exact case-insensitive match through upsertEntry as the owner", async () => {
    const result = await captureLog(DB, {
      ownerId: OWNER_USER_ID,
      rawProject: "work",
      timeSpent: "large",
      milestone: "shipped it",
      description: "wired the pipeline",
    });
    expect(result.status).toBe("logged");
    expect(getOwnerActiveProjects).toHaveBeenCalledWith(DB, OWNER_USER_ID);
    expect(getOwnerAliases).toHaveBeenCalledWith(DB, OWNER_USER_ID);
    expect(upsertEntry).toHaveBeenCalledTimes(1);
    expect(upsertEntry).toHaveBeenCalledWith(DB, {
      projectId: "id-work",
      timeSpent: "large",
      milestone: "shipped it",
      description: "wired the pipeline",
      userId: OWNER_USER_ID,
    });
  });

  it("returns the resolved Project and the upsertEntry result on success", async () => {
    const entry = { id: "e42", entry_date: "2026-07-14" };
    upsertEntry.mockResolvedValue(entry);
    const result = await capture("Work");
    expect(result).toEqual({ status: "logged", project: PROJECTS[2], entry });
  });

  it("resolves an alias to its Project (ADR-0010)", async () => {
    getOwnerAliases.mockResolvedValue([aliasRow("aim", "id-ai-m")]);
    const result = await capture("AIM");
    expect(result.status).toBe("logged");
    expect(upsertEntry).toHaveBeenCalledWith(
      DB,
      expect.objectContaining({ projectId: "id-ai-m" }),
    );
  });

  it("returns unresolved with the did-you-mean copy on no match, without writing", async () => {
    const result = await capture("turk");
    expect(result).toEqual({
      status: "unresolved",
      message: 'no single active project matches "turk". did you mean: Turkish?',
    });
    expect(upsertEntry).not.toHaveBeenCalled();
  });

  it("stays unresolved when an alias collides with another project's name", async () => {
    getOwnerAliases.mockResolvedValue([aliasRow("work", "id-turkish")]);
    const result = await capture("work");
    expect(result.status).toBe("unresolved");
    expect(upsertEntry).not.toHaveBeenCalled();
  });

  it("returns write-failed when upsertEntry rejects after a clean resolve", async () => {
    upsertEntry.mockRejectedValue(new Error("db down"));
    const result = await capture("Work");
    expect(result).toEqual({ status: "write-failed" });
    expect(upsertEntry).toHaveBeenCalledTimes(1);
  });
});
