// Unit tests for the ADR-0008 import loop at its own level (lib/import):
// name-resolution dedup, Project creation with envelope metadata, failure
// accumulation seeded from parser errors, and the two quirks kept verbatim
// (issue #16): write failures numbered `i + 2` over the filtered valid rows,
// and archived Projects reused as-is without revival.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportRow, ParsedImport } from "@/lib/export";
import type { Db } from "@/lib/queries";
import type { Project } from "@/lib/types";

const { upsertEntry, createProject } = vi.hoisted(() => ({
  upsertEntry: vi.fn(),
  createProject: vi.fn(),
}));

vi.mock("@/lib/entries", () => ({ upsertEntry }));
vi.mock("@/lib/projects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/projects")>();
  return { ...actual, createProject };
});

import { runImport } from "@/lib/import";

const projectsSelect = vi.fn();
const DB = {
  from: (table: string) => ({ select: (columns: string) => projectsSelect(table, columns) }),
} as unknown as Db;

function project(name: string, overrides: Partial<Project> = {}): Project {
  return {
    id: `id-${name.toLowerCase()}`,
    user_id: "u1",
    name,
    category: null,
    status: "active",
    color: "#7c8cf8",
    started: null,
    description: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function row(projectName: string, entryDate: string, overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    entryDate,
    projectName,
    timeSpent: "small",
    milestone: null,
    description: null,
    ...overrides,
  };
}

function parsed(rows: ImportRow[], overrides: Partial<ParsedImport> = {}): ParsedImport {
  return { rows, errors: [], projects: [], ...overrides };
}

beforeEach(() => {
  projectsSelect.mockReset().mockResolvedValue({ data: [], error: null });
  upsertEntry.mockReset().mockResolvedValue({ id: "e1" });
  createProject
    .mockReset()
    .mockImplementation(async (_db: unknown, input: { name: string }) =>
      project(input.name, { id: `created-${input.name.toLowerCase()}` }),
    );
});

describe("project resolution", () => {
  it("reuses known Projects and creates each unknown name exactly once", async () => {
    projectsSelect.mockResolvedValue({ data: [project("Alpha")], error: null });
    const outcome = await runImport(
      DB,
      parsed([
        row("alpha", "2026-07-01"),
        row("Beta", "2026-07-01"),
        row(" beta ", "2026-07-02"), // dedup key trims + lowercases
        row("BETA", "2026-07-03"),
      ]),
    );
    expect(createProject).toHaveBeenCalledTimes(1);
    expect(createProject).toHaveBeenCalledWith(DB, {
      name: "Beta",
      category: null,
      color: null,
      description: null,
    });
    expect(outcome).toEqual({ imported: 4, projectsCreated: 1, failed: [] });
    expect(
      upsertEntry.mock.calls.map((c: unknown[]) => (c[1] as { projectId: string }).projectId),
    ).toEqual(["id-alpha", "created-beta", "created-beta", "created-beta"]);
  });

  it("counts each distinct created Project and passes envelope metadata along", async () => {
    const outcome = await runImport(
      DB,
      parsed([row("Turkish", "2026-07-01"), row("Piano", "2026-07-01")], {
        projects: [
          {
            name: "Turkish",
            category: "language",
            color: "#aabbcc",
            status: "active",
            description: "evening drills",
          },
        ],
      }),
    );
    expect(createProject).toHaveBeenCalledTimes(2);
    expect(createProject).toHaveBeenNthCalledWith(1, DB, {
      name: "Turkish",
      category: "language",
      color: "#aabbcc",
      description: "evening drills",
    });
    expect(createProject).toHaveBeenNthCalledWith(2, DB, {
      name: "Piano",
      category: null,
      color: null,
      description: null,
    });
    expect(outcome.projectsCreated).toBe(2);
  });

  it("reuses an archived Project's id as-is without creating or reviving it", async () => {
    // Known quirk (issue #16): the known map ignores status, so the archived
    // Project stays archived; only unknown names hit createProject's revive.
    projectsSelect.mockResolvedValue({
      data: [project("Alpha", { status: "archived" })],
      error: null,
    });
    const outcome = await runImport(DB, parsed([row("alpha", "2026-07-01")]));
    expect(createProject).not.toHaveBeenCalled();
    expect(upsertEntry).toHaveBeenCalledWith(DB, expect.objectContaining({ projectId: "id-alpha" }));
    expect(outcome).toEqual({ imported: 1, projectsCreated: 0, failed: [] });
  });

  it("rethrows the Projects fetch error unwrapped", async () => {
    const boom = new Error("db down");
    projectsSelect.mockResolvedValue({ data: null, error: boom });
    await expect(runImport(DB, parsed([row("alpha", "2026-07-01")]))).rejects.toBe(boom);
    expect(upsertEntry).not.toHaveBeenCalled();
  });
});

describe("failure accumulation", () => {
  it("keeps writing after a row fails and reports the failure as i + 2", async () => {
    upsertEntry.mockImplementation(async (_db: unknown, input: { entryDate?: string }) => {
      if (input.entryDate === "2026-07-02") throw new Error("write exploded");
      return { id: "e1" };
    });
    const outcome = await runImport(
      DB,
      parsed([row("Alpha", "2026-07-01"), row("Alpha", "2026-07-02"), row("Alpha", "2026-07-03")]),
    );
    expect(outcome.imported).toBe(2);
    expect(outcome.failed).toEqual([{ line: 3, message: "write exploded" }]);
  });

  it("seeds failures with the parser's errors, then appends write failures in row order", async () => {
    upsertEntry
      .mockResolvedValueOnce({ id: "e1" })
      .mockRejectedValueOnce(new Error("second write failed"))
      .mockRejectedValueOnce("not an Error");
    const outcome = await runImport(
      DB,
      parsed(
        [row("Alpha", "2026-07-01"), row("Alpha", "2026-07-02"), row("Alpha", "2026-07-03")],
        { errors: [{ line: 3, message: "invalid time_spent" }] },
      ),
    );
    // Known quirk (issue #16): write-failure lines index the *filtered* rows
    // array, so after one parse error they mis-point by one file line.
    expect(outcome).toEqual({
      imported: 1,
      projectsCreated: 1,
      failed: [
        { line: 3, message: "invalid time_spent" },
        { line: 3, message: "second write failed" },
        { line: 4, message: "write failed" }, // non-Error rejection fallback
      ],
    });
  });
});
