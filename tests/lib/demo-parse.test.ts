// The DEMO_MODE fixture parser (ADR-0016) is a pure function over CSV text: it
// produces the same domain row shapes the Supabase queries return, maps empty
// cells to null, and handles RFC 4180 quoting so fixture prose is safe.
import { describe, expect, it } from "vitest";
import { parseCsv, parseEntriesCsv, parseProjectsCsv, parseReflectionsCsv } from "@/lib/demo/parse";
import { DEMO_USER_ID } from "@/lib/demo/mode";
import { TIME_SIZES } from "@/lib/types";

describe("parseCsv (RFC 4180)", () => {
  it("keys each row by the header and drops blank lines", () => {
    expect(parseCsv("a,b\n1,2\n\n3,4\n")).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("unquotes fields containing commas, quotes and newlines", () => {
    const rows = parseCsv('a,b\n"x,y","he said ""hi""\nagain"\n');
    expect(rows).toEqual([{ a: "x,y", b: 'he said "hi"\nagain' }]);
  });

  it("returns no rows for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("parseProjectsCsv", () => {
  const csv =
    "id,name,category,status,color,started,description\n" +
    "p1,Work,Work,active,#7c8cf8,2026-01-02,Day job.\n" +
    "p2,Solo,,archived,,,\n";

  it("maps rows to Project domain types with the demo owner stamped on", () => {
    const [work, solo] = parseProjectsCsv(csv);
    expect(work).toEqual({
      id: "p1",
      user_id: DEMO_USER_ID,
      name: "Work",
      category: "Work",
      status: "active",
      color: "#7c8cf8",
      started: "2026-01-02",
      description: "Day job.",
      created_at: "2026-01-02T12:00:00Z",
    });
    // Empty nullable cells become null; status defaults to active.
    expect(solo.category).toBeNull();
    expect(solo.color).toBeNull();
    expect(solo.started).toBeNull();
    expect(solo.description).toBeNull();
  });
});

describe("parseEntriesCsv", () => {
  it("maps rows to Entry domain types and nulls an empty milestone", () => {
    const csv =
      "id,project_id,entry_date,time_spent,milestone,description\n" +
      "e1,p1,2026-03-03,large,Shipped it,Big day.\n" +
      "e2,p1,2026-03-04,small,,Quiet day.\n";
    const [shipped, quiet] = parseEntriesCsv(csv);
    expect(shipped).toEqual({
      id: "e1",
      user_id: DEMO_USER_ID,
      project_id: "p1",
      entry_date: "2026-03-03",
      time_spent: "large",
      milestone: "Shipped it",
      description: "Big day.",
      created_at: "2026-03-03T12:00:00Z",
    });
    expect(quiet.milestone).toBeNull();
    expect(TIME_SIZES).toContain(quiet.time_spent);
  });

  it("rejects an unknown time_spent value", () => {
    const csv = "id,project_id,entry_date,time_spent,milestone,description\ne1,p1,2026-03-03,huge,,x\n";
    expect(() => parseEntriesCsv(csv)).toThrow(/invalid time_spent "huge"/);
  });
});

describe("parseReflectionsCsv", () => {
  it("maps rows to Reflection domain types with owner and timestamps stamped on", () => {
    const csv = 'entry_date,reflection\n2026-03-03,"Long day, good day."\n';
    expect(parseReflectionsCsv(csv)).toEqual([
      {
        user_id: DEMO_USER_ID,
        entry_date: "2026-03-03",
        reflection: "Long day, good day.",
        created_at: "2026-03-03T21:00:00Z",
        updated_at: "2026-03-03T21:00:00Z",
      },
    ]);
  });

  it("rejects an empty reflection", () => {
    const csv = "entry_date,reflection\n2026-03-03,\n";
    expect(() => parseReflectionsCsv(csv)).toThrow(/empty reflection for 2026-03-03/);
  });
});
