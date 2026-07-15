import { describe, expect, it } from "vitest";
import { buildExportJSON, entriesToCSV, parseCSV, parseImport } from "@/lib/export";
import type { EntryWithProject, Project } from "@/lib/types";

function entry(overrides: Partial<EntryWithProject> = {}): EntryWithProject {
  return {
    id: "e1",
    user_id: "u1",
    project_id: "p1",
    entry_date: "2026-07-01",
    time_spent: "medium",
    milestone: null,
    description: null,
    created_at: "2026-07-01T12:00:00Z",
    project: { id: "p1", name: "prog-log", color: "#7c8cf8", category: "coding", status: "active" },
    ...overrides,
  };
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    user_id: "u1",
    name: "prog-log",
    category: "coding",
    status: "active",
    color: "#7c8cf8",
    started: null,
    description: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("entriesToCSV", () => {
  it("escapes commas, quotes and newlines per RFC 4180", () => {
    const csv = entriesToCSV([
      entry({
        milestone: 'shipped "v1", finally',
        description: "line one\nline two",
      }),
    ]);
    expect(csv).toContain('"shipped ""v1"", finally"');
    expect(csv).toContain('"line one\nline two"');
    expect(csv.startsWith("entry_date,project,time_spent,milestone,description")).toBe(true);
  });

  it("round-trips through parseImport with identical normalized rows", () => {
    const entries = [
      entry(),
      entry({
        id: "e2",
        entry_date: "2026-07-02",
        time_spent: "large",
        milestone: "métro, boulot, dodo",
        description: 'said "done"',
        project: { id: "p2", name: "Turkish, advanced", color: null, category: null, status: "active" },
      }),
    ];
    const parsed = parseImport(entriesToCSV(entries));
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toEqual([
      {
        line: 2,
        entryDate: "2026-07-01",
        projectName: "prog-log",
        timeSpent: "medium",
        milestone: null,
        description: null,
      },
      {
        line: 3,
        entryDate: "2026-07-02",
        projectName: "Turkish, advanced",
        timeSpent: "large",
        milestone: "métro, boulot, dodo",
        description: 'said "done"',
      },
    ]);
  });
});

describe("buildExportJSON", () => {
  it("round-trips through parseImport, carrying project metadata", () => {
    const envelope = buildExportJSON(
      [project(), project({ id: "p2", name: "Turkish", status: "archived", color: null, category: null })],
      [entry({ milestone: "first 100 words" })],
      "America/Toronto",
      new Date("2026-07-03T12:00:00Z"),
    );
    expect(envelope.version).toBe(1);
    expect(envelope.timezone).toBe("America/Toronto");

    const parsed = parseImport(JSON.stringify(envelope));
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toEqual([
      {
        line: 1,
        entryDate: "2026-07-01",
        projectName: "prog-log",
        timeSpent: "medium",
        milestone: "first 100 words",
        description: null,
      },
    ]);
    expect(parsed.projects).toEqual([
      { name: "prog-log", category: "coding", color: "#7c8cf8", status: "active", description: null },
      { name: "Turkish", category: null, color: null, status: "archived", description: null },
    ]);
  });
});

describe("parseCSV", () => {
  it("handles quoted fields, doubled quotes, CRLF and LF", () => {
    expect(parseCSV('a,"b,c",d\r\n"say ""hi""",2,3\nx,y,z')).toEqual([
      ["a", "b,c", "d"],
      ['say "hi"', "2", "3"],
      ["x", "y", "z"],
    ]);
  });

  it("keeps newlines inside quoted fields", () => {
    expect(parseCSV('a,"line1\nline2",c')).toEqual([["a", "line1\nline2", "c"]]);
  });
});

describe("parseImport (CSV)", () => {
  it("accepts header aliases and size shorthands, any casing", () => {
    const parsed = parseImport(
      ["Date,Project,Time Commitment,Milestone,Notes", "2026-06-30,aim,L,, from notion"].join("\n"),
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toEqual([
      {
        line: 2,
        entryDate: "2026-06-30",
        projectName: "aim",
        timeSpent: "large",
        milestone: null,
        description: "from notion",
      },
    ]);
  });

  it("reports per-line errors and keeps the good rows", () => {
    const parsed = parseImport(
      [
        "entry_date,project,time_spent",
        "2026-02-30,aim,small", // not a real date
        "2026-07-01,,medium", // missing project
        "2026-07-01,aim,huge", // bad size
        "2026-07-01,aim,small",
      ].join("\n"),
    );
    expect(parsed.rows).toEqual([
      {
        line: 5,
        entryDate: "2026-07-01",
        projectName: "aim",
        timeSpent: "small",
        milestone: null,
        description: null,
      },
    ]);
    expect(parsed.errors).toEqual([
      { line: 2, message: 'invalid entry_date "2026-02-30" (expected YYYY-MM-DD)' },
      { line: 3, message: "missing project name" },
      { line: 4, message: 'invalid time_spent "huge" (small|medium|large)' },
    ]);
  });

  it("rejects a file without the required headers", () => {
    const parsed = parseImport("foo,bar\n1,2");
    expect(parsed.rows).toEqual([]);
    expect(parsed.errors[0].message).toMatch(/header must include/);
  });
});

describe("parseImport (JSON)", () => {
  it("rejects JSON that is not a prog-log envelope", () => {
    const parsed = parseImport('{"entries": []}');
    expect(parsed.rows).toEqual([]);
    expect(parsed.errors[0].message).toMatch(/not a prog-log export/);
  });

  it("rejects invalid JSON with a clear error", () => {
    const parsed = parseImport("{nope");
    expect(parsed.errors[0].message).toBe("not valid JSON");
  });
});
