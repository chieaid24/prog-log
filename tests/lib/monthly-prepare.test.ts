import { describe, expect, it } from "vitest";
import {
  buildMilestoneRows,
  buildMonthNav,
  buildShareSegments,
  buildStackRows,
  buildWeekdayRows,
  monthEntries,
  monthStat,
  monthTicks,
  monthWindow,
  parseMonthParam,
  shortMonthLabel,
  TIME_RAMP,
  timeSplit,
} from "@/components/monthly/prepare";
import type { EntryWithProject, ProjectMonthSplit, TimeSize } from "@/lib/types";
import type { ProjectShare, TrendPoint, WeekdayPattern } from "@/lib/rollups";

const TODAY = "2026-07-02";

function entry(
  date: string,
  projectName: string,
  time: TimeSize,
  milestone: string | null = null,
): EntryWithProject {
  return {
    id: `${projectName.toLowerCase()}-${date}`,
    user_id: "u1",
    project_id: projectName.toLowerCase(),
    entry_date: date,
    time_spent: time,
    milestone,
    description: null,
    created_at: `${date}T12:00:00Z`,
    project: {
      id: projectName.toLowerCase(),
      name: projectName,
      color: "#7c8cf8",
      category: null,
      status: "active",
    },
  };
}

describe("parseMonthParam", () => {
  it("accepts a valid YYYY-MM and returns the month start", () => {
    expect(parseMonthParam("2026-03", TODAY)).toBe("2026-03-01");
  });

  it.each(["2026-13", "2026-00", "garbage", "2026-3", "", undefined])(
    "falls back to the current month for %j",
    (bad) => {
      expect(parseMonthParam(bad as string | undefined, TODAY)).toBe("2026-07-01");
    },
  );
});

describe("buildMonthNav", () => {
  it("links prev/next months and flags the current month", () => {
    expect(buildMonthNav("2026-07-01", TODAY)).toEqual({
      title: "July 2026",
      prev: "2026-06",
      next: "2026-08",
      isCurrentMonth: true,
    });
    expect(buildMonthNav("2026-01-01", TODAY).isCurrentMonth).toBe(false);
    expect(buildMonthNav("2026-01-01", TODAY).prev).toBe("2025-12");
  });
});

function split(name: string, s: number, m: number, l: number): ProjectMonthSplit {
  return {
    projectId: name.toLowerCase(),
    projectName: name,
    color: "#7c8cf8",
    counts: { small: s, medium: m, large: l },
  };
}

describe("buildStackRows", () => {
  it("maps splits to rows preserving weight order", () => {
    const rows = buildStackRows([split("AI-M", 0, 1, 3), split("Turkish", 2, 0, 0)]);
    expect(rows.map((r) => r.name)).toEqual(["AI-M", "Turkish"]);
    expect(rows[0]).toMatchObject({ small: 0, medium: 1, large: 3 });
  });

  it("folds a long tail into Other", () => {
    const many = Array.from({ length: 13 }, (_, i) => split(`P${i}`, 1, 0, 0));
    const rows = buildStackRows(many);
    expect(rows).toHaveLength(10);
    expect(rows[9].name).toBe("Other (4)");
    expect(rows[9].small).toBe(4);
  });
});

describe("trend ticks", () => {
  it("returns first-of-month dates and short labels", () => {
    const points: TrendPoint[] = [
      { date: "2026-05-31", weight: 0, rolling: 0 },
      { date: "2026-06-01", weight: 1, rolling: 0.5 },
      { date: "2026-07-01", weight: 2, rolling: 1 },
      { date: "2026-07-02", weight: 0, rolling: 1 },
    ];
    expect(monthTicks(points)).toEqual(["2026-06-01", "2026-07-01"]);
    expect(shortMonthLabel("2026-06-01")).toBe("Jun");
  });
});

describe("buildWeekdayRows", () => {
  it("labels weekdays Monday-first and marks exactly one peak", () => {
    const pattern: WeekdayPattern[] = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      entries: 0,
      weight: 0,
    }));
    pattern[1] = { weekday: 1, entries: 3, weight: 5 };
    pattern[4] = { weekday: 4, entries: 2, weight: 5 };
    const rows = buildWeekdayRows(pattern);
    expect(rows[0].label).toBe("Mon");
    expect(rows.filter((r) => r.isPeak)).toHaveLength(1);
    expect(rows[1].isPeak).toBe(true); // first max wins
  });

  it("marks no peak when the month is empty", () => {
    const rows = buildWeekdayRows(
      Array.from({ length: 7 }, (_, weekday) => ({ weekday, entries: 0, weight: 0 })),
    );
    expect(rows.every((r) => !r.isPeak)).toBe(true);
  });
});

function share(name: string, weight: number, total: number): ProjectShare {
  return {
    projectId: name.toLowerCase(),
    projectName: name,
    color: "#f472b6",
    weight,
    share: total === 0 ? 0 : weight / total,
  };
}

describe("buildShareSegments", () => {
  it("returns integer percents and keeps slivers visible", () => {
    const segs = buildShareSegments([share("Big", 99, 100), share("Tiny", 1, 100)]);
    expect(segs[0].pct).toBe(99);
    expect(segs[1].pct).toBe(1); // clamped up, never 0
  });

  it("folds beyond six segments into Other", () => {
    const shares = Array.from({ length: 8 }, (_, i) => share(`P${i}`, 10, 80));
    const segs = buildShareSegments(shares);
    expect(segs).toHaveLength(7);
    expect(segs[6].name).toBe("Other (2)");
  });

  it("returns nothing for an empty month", () => {
    expect(buildShareSegments([])).toEqual([]);
  });
});

describe("monthWindow", () => {
  it("unions the displayed month with the 90-day trend range", () => {
    const w = monthWindow("2026-03-01", TODAY);
    expect(w.monthEnd).toBe("2026-03-31");
    expect(w.trendFrom).toBe("2026-04-04"); // 90 days ending 2026-07-02
    expect(w.from).toBe("2026-03-01"); // month is earlier than the trend
    expect(w.to).toBe(TODAY); // today is later than the month end
  });

  it("covers the trend alone when viewing the current month", () => {
    const w = monthWindow("2026-07-01", TODAY);
    expect(w.from).toBe("2026-04-04");
    expect(w.to).toBe("2026-07-31"); // month end is later than today
  });
});

describe("monthStat / monthEntries / timeSplit", () => {
  const entries = [
    entry("2026-06-01", "AI-M", "large", "shipped the heatmap"),
    entry("2026-06-01", "Work", "small"),
    entry("2026-06-14", "AI-M", "medium"),
    entry("2026-07-01", "Work", "large"), // outside June
  ];

  it("filters to the displayed month", () => {
    expect(monthEntries(entries, "2026-06-01")).toHaveLength(3);
  });

  it("aggregates the month's stats", () => {
    expect(monthStat(entries, "2026-06-01")).toEqual({
      month: "2026-06-01",
      daysWorked: 2,
      entries: 3,
      largeSessions: 1,
      milestones: 1,
    });
  });

  it("returns all zeros for an empty month", () => {
    expect(monthStat(entries, "2026-01-01")).toEqual({
      month: "2026-01-01",
      daysWorked: 0,
      entries: 0,
      largeSessions: 0,
      milestones: 0,
    });
  });

  it("counts Entries per Time Commitment", () => {
    expect(timeSplit(monthEntries(entries, "2026-06-01"))).toEqual({
      small: 1,
      medium: 1,
      large: 1,
    });
  });
});

describe("buildMilestoneRows", () => {
  it("keeps only Milestones, in chronological order", () => {
    const rows = buildMilestoneRows([
      entry("2026-06-20", "Work", "small", "landed the audit"),
      entry("2026-06-03", "AI-M", "large", "shipped the heatmap"),
      entry("2026-06-10", "Turkish", "medium"), // no Milestone
    ]);
    expect(rows.map((r) => r.milestone)).toEqual(["shipped the heatmap", "landed the audit"]);
    expect(rows[0]).toMatchObject({ date: "2026-06-03", projectName: "AI-M" });
  });
});

describe("TIME_RAMP", () => {
  it("is one hue with three distinct steps (validated ordinal ramp)", () => {
    expect(new Set(Object.values(TIME_RAMP)).size).toBe(3);
  });
});
