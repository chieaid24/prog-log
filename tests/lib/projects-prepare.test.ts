import { describe, expect, it } from "vitest";
import { OTHER_COLOR } from "@/components/monthly/prepare";
import {
  buildComparisonRows,
  buildDonutSegments,
  buildStreakRows,
} from "@/components/projects/prepare";
import type { ProjectShare, ProjectTotals } from "@/lib/rollups";
import type { EntryWithProject, TimeSize } from "@/lib/types";

function share(overrides: Partial<ProjectShare> & { projectName: string }): ProjectShare {
  return {
    projectId: `p-${overrides.projectName}`,
    color: "#bd6254",
    weight: 1,
    share: 1,
    ...overrides,
  };
}

function totals(overrides: Partial<ProjectTotals> & { projectName: string }): ProjectTotals {
  return {
    projectId: `p-${overrides.projectName}`,
    color: "#bd6254",
    entries: 1,
    weight: 1,
    share: 1,
    firstLogged: "2026-07-01",
    lastLogged: "2026-07-01",
    milestones: 0,
    ...overrides,
  };
}

let seq = 0;
function entry(date: string, projectName: string, time: TimeSize = "small"): EntryWithProject {
  seq += 1;
  return {
    id: `e${seq}`,
    user_id: "u1",
    project_id: `p-${projectName}`,
    entry_date: date,
    time_spent: time,
    milestone: null,
    description: null,
    created_at: `${date}T12:00:00Z`,
    project: {
      id: `p-${projectName}`,
      name: projectName,
      color: "#bd6254",
      category: "Learning",
      status: "active",
    },
  };
}

describe("buildDonutSegments", () => {
  it("maps shares to named, colored, integer-percent slices", () => {
    const segments = buildDonutSegments([
      share({ projectName: "AI-M", color: "#339797", weight: 6, share: 0.75 }),
      share({ projectName: "Turkish", color: "#bf5b76", weight: 2, share: 0.25 }),
    ]);
    expect(segments).toEqual([
      { name: "AI-M", color: "#339797", pct: 75, weight: 6 },
      { name: "Turkish", color: "#bf5b76", pct: 25, weight: 2 },
    ]);
  });

  it("keeps a sliver visible at 1 percent minimum", () => {
    const segments = buildDonutSegments([
      share({ projectName: "Big", weight: 400, share: 0.998 }),
      share({ projectName: "Tiny", weight: 1, share: 0.002 }),
    ]);
    expect(segments[1].pct).toBe(1);
  });

  it("omits projects with no logged effort", () => {
    const segments = buildDonutSegments([
      share({ projectName: "Logged", weight: 3, share: 1 }),
      share({ projectName: "Idle", weight: 0, share: 0 }),
    ]);
    expect(segments.map((s) => s.name)).toEqual(["Logged"]);
  });

  it("falls back to the neutral color when a project has none", () => {
    const segments = buildDonutSegments([share({ projectName: "Colorless", color: null })]);
    expect(segments[0].color).toBe(OTHER_COLOR);
  });

  it("returns nothing for no shares", () => {
    expect(buildDonutSegments([])).toEqual([]);
  });
});

describe("buildComparisonRows", () => {
  it("maps totals to rows in the given dominant-first order", () => {
    const rows = buildComparisonRows([
      totals({ projectName: "AI-M", color: "#339797", entries: 4, weight: 9 }),
      totals({ projectName: "Turkish", color: "#bf5b76", entries: 2, weight: 3 }),
    ]);
    expect(rows).toEqual([
      { name: "AI-M", color: "#339797", entries: 4, weight: 9 },
      { name: "Turkish", color: "#bf5b76", entries: 2, weight: 3 },
    ]);
  });

  it("keeps a zero-entry project as an empty row", () => {
    const rows = buildComparisonRows([
      totals({ projectName: "Logged" }),
      totals({ projectName: "Idle", entries: 0, weight: 0, share: 0 }),
    ]);
    expect(rows[1]).toEqual({ name: "Idle", color: "#bd6254", entries: 0, weight: 0 });
  });

  it("falls back to the neutral color when a project has none", () => {
    const rows = buildComparisonRows([totals({ projectName: "Colorless", color: null })]);
    expect(rows[0].color).toBe(OTHER_COLOR);
  });

  it("returns nothing for no totals", () => {
    expect(buildComparisonRows([])).toEqual([]);
  });
});

describe("buildStreakRows", () => {
  const today = "2026-07-10";

  it("computes each project's own streak and momentum in totals order", () => {
    const rows = buildStreakRows(
      [totals({ projectName: "AI-M" }), totals({ projectName: "Turkish" })],
      [
        // AI-M: 3 consecutive days ending today, all inside the last 14 days.
        entry("2026-07-08", "AI-M"),
        entry("2026-07-09", "AI-M"),
        entry("2026-07-10", "AI-M"),
        // Turkish: only older activity, in the previous 14-day window.
        entry("2026-06-20", "Turkish"),
        entry("2026-06-22", "Turkish"),
      ],
      today,
    );
    expect(rows.map((r) => r.name)).toEqual(["AI-M", "Turkish"]);
    expect(rows[0]).toMatchObject({ streak: 3, hasEntries: true });
    expect(rows[0].momentum).toMatchObject({ daysLast14: 3, direction: "rising" });
    expect(rows[1]).toMatchObject({ streak: 0, hasEntries: true });
    expect(rows[1].momentum).toMatchObject({ daysLast14: 0, daysPrev14: 2, direction: "cooling" });
  });

  it("keeps a streak alive when the last log was yesterday", () => {
    const rows = buildStreakRows(
      [totals({ projectName: "AI-M" })],
      [entry("2026-07-08", "AI-M"), entry("2026-07-09", "AI-M")],
      today,
    );
    expect(rows[0].streak).toBe(2);
  });

  it("zeroes a project with no entries and marks it entry-less", () => {
    const rows = buildStreakRows(
      [totals({ projectName: "Idle", entries: 0, weight: 0, share: 0 })],
      [],
      today,
    );
    expect(rows[0]).toMatchObject({ streak: 0, hasEntries: false });
    expect(rows[0].momentum.direction).toBe("steady");
  });

  it("returns nothing for no totals", () => {
    expect(buildStreakRows([], [], today)).toEqual([]);
  });
});
