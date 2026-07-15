// Characterization tests for the import server action (PRD §8, ADR-0008):
// pin the guard copy, the auth gate, the parse short-circuits, and the
// create-missing-Projects + upsert-accumulate loop through the action's real
// FormData interface, including the issue #16 fixes: write failures retain
// their parser source position, and archived Projects go through the shared
// create-or-revive path.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/lib/types";

const { DB, getUser, projectsSelect, upsertEntry, createProject, revalidatePath } = vi.hoisted(
  () => {
    const getUser = vi.fn();
    const projectsSelect = vi.fn();
    return {
      getUser,
      projectsSelect,
      // The action only touches auth.getUser() and from("projects").select("*")
      // directly; everything else goes through the mocked lib seams below.
      DB: {
        auth: { getUser },
        from: (table: string) => ({ select: (columns: string) => projectsSelect(table, columns) }),
      },
      upsertEntry: vi.fn(),
      createProject: vi.fn(),
      revalidatePath: vi.fn(),
    };
  },
);

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => DB }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/entries", () => ({ upsertEntry }));
vi.mock("@/lib/projects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/projects")>();
  return { ...actual, createProject };
});

import { importEntriesAction } from "@/app/actions/data";

const CSV_HEADER = "entry_date,project,time_spent,milestone,description";

function csv(...rows: string[]): string {
  return [CSV_HEADER, ...rows].join("\r\n") + "\r\n";
}

function fileForm(text: string, name = "export.csv"): FormData {
  const type = name.endsWith(".json") ? "application/json" : "text/csv";
  const fd = new FormData();
  fd.append("file", new File([text], name, { type }));
  return fd;
}

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

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "u1" } } });
  projectsSelect.mockReset().mockResolvedValue({ data: [], error: null });
  upsertEntry.mockReset().mockResolvedValue({ id: "e1", entry_date: "2026-07-01" });
  createProject
    .mockReset()
    .mockImplementation(async (_db: unknown, input: { name: string }) =>
      project(input.name, { id: `created-${input.name.toLowerCase()}` }),
    );
  revalidatePath.mockReset();
});

describe("file guards", () => {
  it("rejects a form without a file, before touching auth", async () => {
    const res = await importEntriesAction(new FormData());
    expect(res).toEqual({ ok: false, error: "Choose a CSV or JSON export file first." });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects an empty file with the same copy", async () => {
    const res = await importEntriesAction(fileForm(""));
    expect(res).toEqual({ ok: false, error: "Choose a CSV or JSON export file first." });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects a file over 5 MB", async () => {
    const fd = new FormData();
    fd.append(
      "file",
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.csv", { type: "text/csv" }),
    );
    const res = await importEntriesAction(fd);
    expect(res).toEqual({
      ok: false,
      error: "File is larger than 5 MB; that is not a prog-log export.",
    });
    expect(getUser).not.toHaveBeenCalled();
  });
});

describe("auth gate", () => {
  it("rejects a signed-out caller without writing", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await importEntriesAction(fileForm(csv("2026-07-01,alpha,small,,")));
    expect(res).toEqual({ ok: false, error: "Not signed in." });
    expect(upsertEntry).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("parse short-circuits", () => {
  it("surfaces the first parse error when no row is importable", async () => {
    const res = await importEntriesAction(fileForm(csv("2026-13-99,alpha,small,,")));
    expect(res).toEqual({
      ok: false,
      error: 'Nothing importable: line 2: invalid entry_date "2026-13-99" (expected YYYY-MM-DD)',
    });
    expect(upsertEntry).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("reports a header-only file as containing no Entries", async () => {
    const res = await importEntriesAction(fileForm(csv()));
    expect(res).toEqual({ ok: false, error: "The file contains no Entries." });
  });
});

describe("happy path", () => {
  it("resolves an existing active Project and upserts with the row's entryDate", async () => {
    projectsSelect.mockResolvedValue({ data: [project("Alpha")], error: null });
    createProject.mockResolvedValue(project("Alpha"));
    const res = await importEntriesAction(
      fileForm(csv("2026-07-01,alpha,small,first steps,notes here")),
    );
    expect(createProject).toHaveBeenCalledWith(DB, {
      name: "alpha",
      category: null,
      color: null,
      description: null,
    });
    expect(upsertEntry).toHaveBeenCalledTimes(1);
    expect(upsertEntry).toHaveBeenCalledWith(DB, {
      projectId: "id-alpha",
      timeSpent: "small",
      milestone: "first steps",
      description: "notes here",
      entryDate: "2026-07-01",
    });
    expect(res).toEqual({ ok: true, imported: 1, projectsCreated: 0, failed: [] });
  });

  it("creates an unknown Project once with the JSON envelope's metadata", async () => {
    const envelope = {
      format: "prog-log-export",
      version: 1,
      exported_at: "2026-07-14T00:00:00Z",
      timezone: "America/Toronto",
      projects: [
        {
          name: "Turkish",
          category: "language",
          color: "#aabbcc",
          status: "active",
          description: "evening drills",
        },
      ],
      entries: [
        { entry_date: "2026-07-01", project: "Turkish", time_spent: "small", milestone: null, description: null },
        { entry_date: "2026-07-02", project: "turkish", time_spent: "large", milestone: "unit 3", description: null },
      ],
    };
    const res = await importEntriesAction(fileForm(JSON.stringify(envelope), "export.json"));
    expect(createProject).toHaveBeenCalledTimes(1);
    expect(createProject).toHaveBeenCalledWith(DB, {
      name: "Turkish",
      category: "language",
      color: "#aabbcc",
      description: "evening drills",
    });
    expect(
      upsertEntry.mock.calls.map((c: unknown[]) => (c[1] as { projectId: string }).projectId),
    ).toEqual(["created-turkish", "created-turkish"]);
    expect(res).toEqual({ ok: true, imported: 2, projectsCreated: 1, failed: [] });
  });

  it("delegates an archived Project match to createProject so it is revived", async () => {
    projectsSelect.mockResolvedValue({
      data: [project("Alpha", { status: "archived" })],
      error: null,
    });
    createProject.mockResolvedValue(project("Alpha", { status: "active" }));
    const res = await importEntriesAction(fileForm(csv("2026-07-01,Alpha,medium,,")));
    expect(createProject).toHaveBeenCalledWith(DB, {
      name: "Alpha",
      category: null,
      color: null,
      description: null,
    });
    expect(upsertEntry).toHaveBeenCalledWith(DB, expect.objectContaining({ projectId: "id-alpha" }));
    expect(res).toEqual({ ok: true, imported: 1, projectsCreated: 0, failed: [] });
  });
});

describe("failure accumulation", () => {
  it("keeps parser and write failures on their true CSV record numbers", async () => {
    projectsSelect.mockResolvedValue({ data: [project("Alpha")], error: null });
    upsertEntry.mockImplementation(async (_db: unknown, input: { entryDate?: string }) => {
      if (input.entryDate === "2026-07-03") throw new Error("write exploded");
      return { id: "e1" };
    });
    const res = await importEntriesAction(
      fileForm(
        csv(
          "2026-07-01,alpha,small,,", // file line 2
          "bad-date,alpha,small,,", // file line 3, parse error
          "2026-07-03,alpha,small,,", // file line 4, write error
        ),
      ),
    );
    expect(res).toEqual({
      ok: true,
      imported: 1,
      projectsCreated: 0,
      failed: [
        { line: 3, message: 'invalid entry_date "bad-date" (expected YYYY-MM-DD)' },
        { line: 4, message: "write exploded" },
      ],
    });
  });
});

describe("revalidation and fetch errors", () => {
  it("revalidates the root layout exactly once on success", async () => {
    projectsSelect.mockResolvedValue({ data: [project("Alpha")], error: null });
    await importEntriesAction(fileForm(csv("2026-07-01,alpha,small,,")));
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("returns the projects fetch error's message and skips revalidation", async () => {
    projectsSelect.mockResolvedValue({ data: null, error: new Error("db down") });
    const res = await importEntriesAction(fileForm(csv("2026-07-01,alpha,small,,")));
    expect(res).toEqual({ ok: false, error: "db down" });
    expect(upsertEntry).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("falls back to the generic message when the thrown value is not an Error", async () => {
    projectsSelect.mockResolvedValue({ data: null, error: { message: "db down", code: "500" } });
    const res = await importEntriesAction(fileForm(csv("2026-07-01,alpha,small,,")));
    expect(res).toEqual({ ok: false, error: "Import failed." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
