// Unit tests for the ADR-0008 import loop at its own level (lib/import):
// name-resolution dedup, Project creation with envelope metadata, failure
// accumulation seeded from parser errors, including the issue #16 guarantees:
// write failures retain their true CSV/JSON source position, and archived
// Projects are resolved through createProject so they are revived.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseImport, type ImportRow, type ParsedImport } from "@/lib/export";
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
    line: 2,
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
  it("resolves each distinct name once and counts only names absent from the initial snapshot", async () => {
    projectsSelect.mockResolvedValue({ data: [project("Alpha")], error: null });
    createProject.mockImplementation(async (_db: unknown, input: { name: string }) =>
      input.name.trim().toLowerCase() === "alpha"
        ? project("Alpha")
        : project(input.name, { id: `created-${input.name.toLowerCase()}` }),
    );
    const outcome = await runImport(
      DB,
      parsed([
        row("alpha", "2026-07-01"),
        row("Beta", "2026-07-01"),
        row(" beta ", "2026-07-02"), // dedup key trims + lowercases
        row("BETA", "2026-07-03"),
      ]),
    );
    expect(createProject).toHaveBeenCalledTimes(2);
    expect(createProject).toHaveBeenNthCalledWith(1, DB, {
      name: "alpha",
      category: null,
      color: null,
      description: null,
    });
    expect(createProject).toHaveBeenNthCalledWith(2, DB, {
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

  it("delegates an archived Project match to createProject so it is revived", async () => {
    projectsSelect.mockResolvedValue({
      data: [project("Alpha", { status: "archived" })],
      error: null,
    });
    createProject.mockResolvedValue(project("Alpha", { status: "active" }));
    const outcome = await runImport(DB, parsed([row("alpha", "2026-07-01")]));
    expect(createProject).toHaveBeenCalledWith(DB, {
      name: "alpha",
      category: null,
      color: null,
      description: null,
    });
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
  it("keeps writing after a row fails and reports the row's source position", async () => {
    upsertEntry.mockImplementation(async (_db: unknown, input: { entryDate?: string }) => {
      if (input.entryDate === "2026-07-02") throw new Error("write exploded");
      return { id: "e1" };
    });
    const outcome = await runImport(
      DB,
      parsed([
        row("Alpha", "2026-07-01", { line: 2 }),
        row("Alpha", "2026-07-02", { line: 8 }),
        row("Alpha", "2026-07-03", { line: 9 }),
      ]),
    );
    expect(outcome.imported).toBe(2);
    expect(outcome.failed).toEqual([{ line: 8, message: "write exploded" }]);
  });

  it("uses true CSV record numbers after invalid rows were filtered out", async () => {
    upsertEntry.mockImplementation(async (_db: unknown, input: { entryDate?: string }) => {
      if (input.entryDate === "2026-07-03") throw new Error("write exploded");
      return { id: "e1" };
    });
    const outcome = await runImport(
      DB,
      parseImport(
        [
          "entry_date,project,time_spent",
          "2026-07-01,Alpha,small",
          "bad-date,Alpha,small",
          "2026-07-03,Alpha,small",
        ].join("\n"),
      ),
    );
    expect(outcome).toEqual({
      imported: 1,
      projectsCreated: 1,
      failed: [
        { line: 3, message: 'invalid entry_date "bad-date" (expected YYYY-MM-DD)' },
        { line: 4, message: "write exploded" },
      ],
    });
  });

  it("uses one-based JSON entry positions rather than the CSV header offset", async () => {
    upsertEntry.mockImplementation(async (_db: unknown, input: { entryDate?: string }) => {
      if (input.entryDate === "2026-07-01") throw "not an Error";
      return { id: "e1" };
    });
    const outcome = await runImport(
      DB,
      parseImport(
        JSON.stringify({
          format: "prog-log-export",
          entries: [
            { entry_date: "2026-07-01", project: "Alpha", time_spent: "small" },
            { entry_date: "bad-date", project: "Alpha", time_spent: "small" },
          ],
        }),
      ),
    );
    expect(outcome).toEqual({
      imported: 0,
      projectsCreated: 1,
      failed: [
        { line: 2, message: 'invalid entry_date "bad-date" (expected YYYY-MM-DD)' },
        { line: 1, message: "write failed" },
      ],
    });
  });
});
