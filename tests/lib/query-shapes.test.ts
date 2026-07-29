// Unit tests for the scope-parameterized query cores (ADR-0007, ADR-0009):
// each shared shape has exactly one definition in lib/queries, the RLS get*
// wrappers apply no user_id filter, and the owner-scoped wrappers in
// lib/discord/owner add the explicit filter the service-role client needs.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import {
  getOwnerActiveProjects,
  getOwnerThrowbackPool,
  getOwnerTimezone,
  getOwnerToday,
} from "@/lib/discord/owner";
import {
  getActiveProjects,
  getThrowbackPool,
  getToday,
  getUserTimezone,
} from "@/lib/queries";
import type { Db } from "@/lib/queries";

const OWNER_ID = "11111111-1111-1111-1111-111111111111";
const TODAY = "2026-07-14";

/**
 * Chainable, thenable query stub: records every builder call (method + args,
 * in order) and resolves `{ data, error }` when awaited.
 */
function fakeDb(
  data: unknown,
  error: unknown = null,
  reflectionData: unknown = [],
  reflectionError: unknown = null,
) {
  const calls: unknown[][] = [];
  const db = {
    from: (table: string) => {
      calls.push(["from", table]);
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "not", "lt", "order", "maybeSingle"]) {
        builder[method] = (...args: unknown[]) => {
          calls.push([method, ...args]);
          return builder;
        };
      }
      builder.then = (resolve: (value: unknown) => unknown) =>
        resolve(
          table === "daily_reflections"
            ? { data: reflectionData, error: reflectionError }
            : { data, error },
        );
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
    kind: "milestone",
    entryId: "e1",
    milestone: "shipped the heatmap",
    entryDate: "2026-07-04",
    projectName: "Work",
    color: "#7c8cf8",
    daysAgo: 10, // 2026-07-04 -> 2026-07-14
  };
  const reflectionRow = {
    reflection: "proud of simplifying the feed",
    entry_date: "2026-07-03",
  };
  const reflectionItem = {
    kind: "reflection",
    reflection: "proud of simplifying the feed",
    entryDate: "2026-07-03",
    daysAgo: 11,
  };

  it("maps milestones and reflections with daysAgo computed from todayISO", async () => {
    const { db } = fakeDb([row], null, [reflectionRow]);
    await expect(getThrowbackPool(db, TODAY)).resolves.toEqual([reflectionItem, item]);
  });

  it("RLS: source filters and date order, no user_id filter", async () => {
    const { db, calls } = fakeDb([]);
    await getThrowbackPool(db, TODAY);
    expect(calls).toEqual([
      ["from", "entries"],
      ["select", "id, milestone, entry_date, project:projects(name, color)"],
      ["not", "milestone", "is", null],
      ["lt", "entry_date", TODAY],
      ["order", "entry_date"],
      ["from", "daily_reflections"],
      ["select", "entry_date, reflection"],
      ["lt", "entry_date", TODAY],
      ["order", "entry_date"],
    ]);
  });

  it("owner: identical shape and mapping, plus the user_id filter", async () => {
    const { db, calls } = fakeDb([row], null, [reflectionRow]);
    await expect(getOwnerThrowbackPool(db, OWNER_ID, TODAY)).resolves.toEqual([
      reflectionItem,
      item,
    ]);
    expect(calls).toEqual([
      ["from", "entries"],
      ["select", "id, milestone, entry_date, project:projects(name, color)"],
      ["eq", "user_id", OWNER_ID],
      ["not", "milestone", "is", null],
      ["lt", "entry_date", TODAY],
      ["order", "entry_date"],
      ["from", "daily_reflections"],
      ["select", "entry_date, reflection"],
      ["eq", "user_id", OWNER_ID],
      ["lt", "entry_date", TODAY],
      ["order", "entry_date"],
    ]);
  });

  it("propagates errors from either source", async () => {
    const boom = new Error("boom");
    await expect(getThrowbackPool(fakeDb(null, boom).db, TODAY)).rejects.toBe(boom);
    await expect(getOwnerThrowbackPool(fakeDb(null, boom).db, OWNER_ID, TODAY)).rejects.toBe(
      boom,
    );
    await expect(
      getThrowbackPool(fakeDb([], null, null, boom).db, TODAY),
    ).rejects.toBe(boom);
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

describe("today shape", () => {
  // 2026-07-14T16:00Z: noon in America/Toronto (still the 14th), 19:00 in
  // Istanbul (the 14th), but already the 15th in Kiritimati (UTC+14). The
  // stored zone, not the server clock, decides the calendar day (ADR-0004).
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-14T16:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("RLS: computes today from the stored timezone, no user_id filter", async () => {
    const { db, calls } = fakeDb({ timezone: "Europe/Istanbul" });
    await expect(getToday(db)).resolves.toBe("2026-07-14");
    expect(calls).toEqual([
      ["from", "app_settings"],
      ["select", "timezone"],
      ["maybeSingle"],
    ]);
  });

  it("owner: computes today from the owner's stored zone across the date line", async () => {
    const { db, calls } = fakeDb({ timezone: "Pacific/Kiritimati" });
    await expect(getOwnerToday(db, OWNER_ID)).resolves.toBe("2026-07-15");
    expect(calls).toContainEqual(["eq", "user_id", OWNER_ID]);
  });

  it("falls back to the default timezone when no row exists", async () => {
    await expect(getToday(fakeDb(null).db)).resolves.toBe("2026-07-14");
    await expect(getOwnerToday(fakeDb(null).db, OWNER_ID)).resolves.toBe("2026-07-14");
  });
});
