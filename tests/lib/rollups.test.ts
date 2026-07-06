import { describe, expect, it } from "vitest";
import {
  intensityLevel,
  toCalendarDayProjects,
  toHeatmapCells,
  toMonthlyStats,
  toProjectMonthSplits,
  toProjectShares,
  toTrend,
  toWeekdayPattern,
} from "@/lib/rollups";
import type { EntryWithProject, TimeSize } from "@/lib/types";

let seq = 0;
function entry(
  date: string,
  time: TimeSize,
  projectName = "Work",
  milestone: string | null = null,
): EntryWithProject {
  seq += 1;
  return {
    id: `e${seq}`,
    user_id: "u1",
    project_id: `p-${projectName}`,
    entry_date: date,
    time_spent: time,
    milestone,
    description: null,
    created_at: `${date}T12:00:00Z`,
    project: {
      id: `p-${projectName}`,
      name: projectName,
      color: "#7c8cf8",
      category: "Work",
      status: "active",
    },
  };
}

describe("toHeatmapCells", () => {
  it("sums weight per day across projects", () => {
    const cells = toHeatmapCells([
      entry("2026-07-01", "small"),
      entry("2026-07-01", "large", "AI-M"),
      entry("2026-07-02", "medium"),
    ]);
    expect(cells).toEqual([
      { date: "2026-07-01", entries: 2, weight: 4 },
      { date: "2026-07-02", entries: 1, weight: 2 },
    ]);
  });

  it("returns nothing for no entries", () => {
    expect(toHeatmapCells([])).toEqual([]);
  });
});

describe("intensityLevel", () => {
  it("buckets weights onto the heat-0..3 ramp", () => {
    expect(intensityLevel(0)).toBe(0);
    expect(intensityLevel(1)).toBe(1);
    expect(intensityLevel(2)).toBe(1);
    expect(intensityLevel(3)).toBe(2);
    expect(intensityLevel(4)).toBe(2);
    expect(intensityLevel(5)).toBe(2);
    expect(intensityLevel(6)).toBe(3);
    expect(intensityLevel(7)).toBe(3);
    expect(intensityLevel(12)).toBe(3);
  });
});

describe("toCalendarDayProjects", () => {
  it("orders each day's cards dominant-project-first", () => {
    const cards = toCalendarDayProjects([
      entry("2026-07-01", "small", "Turkish"),
      entry("2026-07-01", "large", "AI-M"),
      entry("2026-07-01", "medium", "Work", "shipped"),
    ]);
    expect(cards.map((c) => c.projectName)).toEqual(["AI-M", "Work", "Turkish"]);
    expect(cards[1].hasMilestone).toBe(true);
    expect(cards[0].weight).toBe(3);
  });
});

describe("toMonthlyStats", () => {
  it("aggregates days, entries, large sessions and milestones per month", () => {
    const stats = toMonthlyStats([
      entry("2026-06-01", "large"),
      entry("2026-06-01", "small", "AI-M", "found the bug"),
      entry("2026-06-15", "medium"),
      entry("2026-07-01", "large", "Work", "launched"),
    ]);
    expect(stats).toEqual([
      { month: "2026-07-01", daysWorked: 1, entries: 1, largeSessions: 1, milestones: 1 },
      { month: "2026-06-01", daysWorked: 2, entries: 3, largeSessions: 1, milestones: 1 },
    ]);
  });
});

describe("toProjectMonthSplits", () => {
  it("counts Time Commitments per project within the month, heaviest first", () => {
    const splits = toProjectMonthSplits(
      [
        entry("2026-07-01", "small", "Turkish"),
        entry("2026-07-02", "small", "Turkish"),
        entry("2026-07-01", "large", "AI-M"),
        entry("2026-07-03", "large", "AI-M"),
        entry("2026-06-30", "large", "AI-M"), // outside month, ignored
      ],
      "2026-07-01",
    );
    expect(splits.map((s) => s.projectName)).toEqual(["AI-M", "Turkish"]);
    expect(splits[0].counts).toEqual({ small: 0, medium: 0, large: 2 });
    expect(splits[1].counts).toEqual({ small: 2, medium: 0, large: 0 });
  });
});

describe("toTrend", () => {
  it("includes zero days and computes the trailing 7-day average", () => {
    const points = toTrend(
      [entry("2026-07-01", "large"), entry("2026-07-03", "medium")],
      "2026-07-01",
      "2026-07-03",
    );
    expect(points).toEqual([
      { date: "2026-07-01", weight: 3, rolling: 3 },
      { date: "2026-07-02", weight: 0, rolling: 1.5 },
      { date: "2026-07-03", weight: 2, rolling: 1.7 },
    ]);
  });
});

describe("toWeekdayPattern", () => {
  it("buckets effort by weekday, Monday first", () => {
    const pattern = toWeekdayPattern([
      entry("2026-06-29", "large"), // Monday
      entry("2026-07-06", "small"), // Monday
      entry("2026-07-05", "medium"), // Sunday
    ]);
    expect(pattern[0]).toEqual({ weekday: 0, entries: 2, weight: 4 });
    expect(pattern[6]).toEqual({ weekday: 6, entries: 1, weight: 2 });
    expect(pattern[2].entries).toBe(0);
  });
});

describe("toProjectShares", () => {
  it("computes each project's share of the month's weight", () => {
    const shares = toProjectShares(
      [entry("2026-07-01", "large", "AI-M"), entry("2026-07-02", "small", "Turkish")],
      "2026-07-01",
    );
    expect(shares[0]).toMatchObject({ projectName: "AI-M", weight: 3, share: 0.75 });
    expect(shares[1]).toMatchObject({ projectName: "Turkish", weight: 1, share: 0.25 });
  });

  it("handles an empty month without dividing by zero", () => {
    expect(toProjectShares([], "2026-07-01")).toEqual([]);
  });
});
