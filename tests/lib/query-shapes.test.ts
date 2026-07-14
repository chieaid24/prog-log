// Unit tests for the scope-parameterized query cores (ADR-0007, ADR-0009):
// each shared shape has exactly one definition in lib/queries, the RLS get*
// wrappers apply no user_id filter, and the owner-scoped wrappers in
// lib/discord/owner add the explicit filter the service-role client needs.
import { describe, expect, it } from "vitest";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import {
  getOwnerActiveProjects,
  getOwnerThrowbackPool,
  getOwnerTimezone,
} from "@/lib/discord/owner";
import { getActiveProjects, getThrowbackPool, getUserTimezone } from "@/lib/queries";
import type { Db } from "@/lib/queries";

const OWNER_ID = "11111111-1111-1111-1111-111111111111";
const TODAY = "2026-07-14";

/**
 * Chainable, thenable query stub: records every builder call (method + args,
 * in order) and resolves `{ data, error }` when awaited.
 */
function fakeDb(data: unknown, error: unknown = null) {
  const calls: unknown[][] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "not", "lt", "order", "maybeSingle"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown) => resolve({ data, error });
  const db = {
    from: (table: string) => {
      calls.push(["from", table]);
      return builder;
    },
  };
  return { db: db as unknown as Db, calls };
}

describe("throwback pool shape", () => {
  const row = {
    id: "e1",
    milestone: "shipped the heatmap",
    entry_date: "2026-07-04",
    project: { name: "Work", color: "#7c8cf8" },
  };
  const item = {
    entryId: "e1",
    milestone: "shipped the heatmap",
    entryDate: "2026-07-04",
    projectName: "Work",
    color: "#7c8cf8",
    daysAgo: 10, // 2026-07-04 -> 2026-07-14
  };

  it("maps a row to a ThrowbackItem with daysAgo computed from todayISO", async () => {
    const { db } = fakeDb([row]);
    await expect(getThrowbackPool(db, TODAY)).resolves.toEqual([item]);
  });

  it("RLS: milestone/date filters and date order, no user_id filter", async () => {
    const { db, calls } = fakeDb([]);
    await getThrowbackPool(db, TODAY);
    expect(calls).toEqual([
      ["from", "entries"],
      ["select", "id, milestone, entry_date, project:projects(name, color)"],
      ["not", "milestone", "is", null],
      ["lt", "entry_date", TODAY],
      ["order", "entry_date"],
    ]);
  });

  it("owner: identical shape and mapping, plus the user_id filter", async () => {
    const { db, calls } = fakeDb([row]);
    await expect(getOwnerThrowbackPool(db, OWNER_ID, TODAY)).resolves.toEqual([item]);
    expect(calls).toEqual([
      ["from", "entries"],
      ["select", "id, milestone, entry_date, project:projects(name, color)"],
      ["eq", "user_id", OWNER_ID],
      ["not", "milestone", "is", null],
      ["lt", "entry_date", TODAY],
      ["order", "entry_date"],
    ]);
  });

  it("propagates a query error", async () => {
    const boom = new Error("boom");
    await expect(getThrowbackPool(fakeDb(null, boom).db, TODAY)).rejects.toBe(boom);
    await expect(getOwnerThrowbackPool(fakeDb(null, boom).db, OWNER_ID, TODAY)).rejects.toBe(
      boom,
    );
  });
});

describe("active projects shape", () => {
  const rows = [{ id: "p1", name: "AI-M" }];

  it("RLS: status filter and name order, no user_id filter", async () => {
    const { db, calls } = fakeDb(rows);
    await expect(getActiveProjects(db)).resolves.toEqual(rows);
    expect(calls).toEqual([
      ["from", "projects"],
      ["select", "*"],
      ["eq", "status", "active"],
      ["order", "name"],
    ]);
  });

  it("owner: identical shape plus the user_id filter", async () => {
    const { db, calls } = fakeDb(rows);
    await expect(getOwnerActiveProjects(db, OWNER_ID)).resolves.toEqual(rows);
    expect(calls).toEqual([
      ["from", "projects"],
      ["select", "*"],
      ["eq", "user_id", OWNER_ID],
      ["eq", "status", "active"],
      ["order", "name"],
    ]);
  });
});

describe("timezone shape", () => {
  it("RLS: maybeSingle on app_settings, no user_id filter", async () => {
    const { db, calls } = fakeDb({ timezone: "Europe/Istanbul" });
    await expect(getUserTimezone(db)).resolves.toBe("Europe/Istanbul");
    expect(calls).toEqual([
      ["from", "app_settings"],
      ["select", "timezone"],
      ["maybeSingle"],
    ]);
  });

  it("owner: identical shape plus the user_id filter", async () => {
    const { db, calls } = fakeDb({ timezone: "Europe/Istanbul" });
    await expect(getOwnerTimezone(db, OWNER_ID)).resolves.toBe("Europe/Istanbul");
    expect(calls).toEqual([
      ["from", "app_settings"],
      ["select", "timezone"],
      ["eq", "user_id", OWNER_ID],
      ["maybeSingle"],
    ]);
  });

  it("falls back to the default timezone when no row exists", async () => {
    await expect(getUserTimezone(fakeDb(null).db)).resolves.toBe(DEFAULT_TIMEZONE);
    await expect(getOwnerTimezone(fakeDb(null).db, OWNER_ID)).resolves.toBe(DEFAULT_TIMEZONE);
  });
});
