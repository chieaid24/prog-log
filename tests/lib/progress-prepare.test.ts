// Progress-view prep (ADR-0023): timeline builder, header bucketing,
// cumulative-effort series, ticks and load-more pagination. Fixed ISO dates
// throughout — the prep is pure string math, so no clock or zone leaks in.
import { describe, expect, it } from "vitest";
import {
  TIMELINE_PAGE,
  buildCumulativeEffort,
  buildTimeline,
  cumulativeTicks,
  hasMoreMoments,
  headerLabel,
  momentDate,
  visibleMoments,
  type TimelineMoment,
} from "@/components/progress/prepare";
import type { EntryWithProject } from "@/lib/types";

function entry(
  overrides: Partial<EntryWithProject> & { entry_date: string },
): EntryWithProject {
  return {
    id: `e-${overrides.entry_date}-${overrides.project?.name ?? "aim"}`,
    user_id: "u1",
    project_id: "p1",
    time_spent: "medium",
    milestone: null,
    description: null,
    created_at: "2026-06-01T12:00:00Z",
    project: { id: "p1", name: "AI-M", color: "#7c8cf8", category: null, status: "active" },
    ...overrides,
  };
}

// 2026-08-05 is a Wednesday; its Monday-first week starts 2026-08-03.
const TODAY = "2026-08-05";

describe("headerLabel", () => {
  it("buckets relative near today and month + year going back", () => {
    expect(headerLabel("2026-08-05", TODAY)).toBe("This week");
    expect(headerLabel("2026-08-03", TODAY)).toBe("This week");
    // Saturday the 1st: same month but the previous week.
    expect(headerLabel("2026-08-01", TODAY)).toBe("This month");
    expect(headerLabel("2026-07-20", TODAY)).toBe("July 2026");
    expect(headerLabel("2025-12-31", TODAY)).toBe("December 2025");
  });

  it("lets the current week reach into the previous month", () => {
    // 2026-08-01 is a Saturday, so its week starts Monday 2026-07-27.
    expect(headerLabel("2026-07-28", "2026-08-01")).toBe("This week");
    expect(headerLabel("2026-07-26", "2026-08-01")).toBe("July 2026");
  });
});

describe("buildTimeline", () => {
  const turkish = { id: "p2", name: "Turkish", color: "#34d399", category: null, status: "active" } as const;

  it("keeps only Reflection or Milestone days, newest first", () => {
    const moments = buildTimeline(
      [
        entry({ entry_date: "2026-08-04", milestone: "shipped the heatmap" }),
        entry({ entry_date: "2026-08-03" }), // plain day: omitted
        entry({ entry_date: "2026-07-01" }),
      ],
      [{ entryDate: "2026-07-01", reflection: "slow but honest day" }],
      TODAY,
    );
    expect(moments.map((m) => m.date)).toEqual(["2026-08-04", "2026-07-01"]);
    expect(moments.map((m) => m.header)).toEqual(["This week", "July 2026"]);
  });

  it("composes a moment: reflection lead, milestones with identity, rest as metadata", () => {
    const [moment] = buildTimeline(
      [
        entry({ entry_date: "2026-08-04", milestone: "shipped the heatmap" }),
        entry({ entry_date: "2026-08-04", project_id: "p2", project: turkish, time_spent: "small" }),
        entry({
          entry_date: "2026-08-04",
          project_id: "p3",
          project: { ...turkish, id: "p3", name: "Work" },
          time_spent: "large",
        }),
      ],
      [{ entryDate: "2026-08-04", reflection: "a good push" }],
      TODAY,
    );
    expect(moment.reflection).toBe("a good push");
    expect(moment.milestones).toEqual([
      {
        entryId: "e-2026-08-04-aim",
        milestone: "shipped the heatmap",
        projectName: "AI-M",
        color: "#7c8cf8",
      },
    ]);
    // Non-Milestone Entries only, heaviest first.
    expect(moment.others).toEqual([
      { projectName: "Work", timeSpent: "large" },
      { projectName: "Turkish", timeSpent: "small" },
    ]);
  });

  it("makes a moment from a Reflection-only day with no Entries", () => {
    const moments = buildTimeline([], [{ entryDate: "2026-08-02", reflection: "rest day" }], TODAY);
    expect(moments).toHaveLength(1);
    expect(moments[0].reflection).toBe("rest day");
    expect(moments[0].milestones).toEqual([]);
    expect(moments[0].others).toEqual([]);
  });
});

describe("momentDate", () => {
  it("formats weekday, month and day off the frozen ISO date", () => {
    expect(momentDate("2026-08-03")).toBe("Mon, Aug 3");
  });
});

describe("buildCumulativeEffort", () => {
  it("runs a monotonic sum from the first logged day through today", () => {
    const points = buildCumulativeEffort(
      [
        entry({ entry_date: "2026-08-01", time_spent: "large" }), // 3
        entry({ entry_date: "2026-08-01", time_spent: "small" }), // +1
        entry({ entry_date: "2026-08-03", time_spent: "medium" }), // +2
      ],
      TODAY,
    );
    expect(points.map((p) => p.date)).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
    ]);
    // Unlogged days carry the total flat; it never drops.
    expect(points.map((p) => p.total)).toEqual([4, 4, 6, 6, 6]);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].total).toBeGreaterThanOrEqual(points[i - 1].total);
    }
  });

  it("is empty with no Entries", () => {
    expect(buildCumulativeEffort([], TODAY)).toEqual([]);
  });
});

describe("cumulativeTicks", () => {
  it("ticks month starts on short spans", () => {
    const points = buildCumulativeEffort([entry({ entry_date: "2026-06-15" })], TODAY);
    expect(cumulativeTicks(points)).toEqual([
      { date: "2026-07-01", label: "Jul" },
      { date: "2026-08-01", label: "Aug" },
    ]);
  });

  it("folds to year starts on multi-year spans", () => {
    const points = buildCumulativeEffort([entry({ entry_date: "2024-01-15" })], TODAY);
    expect(cumulativeTicks(points)).toEqual([
      { date: "2025-01-01", label: "2025" },
      { date: "2026-01-01", label: "2026" },
    ]);
  });
});

describe("load-more pagination", () => {
  const moments: TimelineMoment[] = Array.from({ length: 25 }, (_, i) => ({
    date: `2026-07-${String(25 - i).padStart(2, "0")}`,
    header: "July 2026",
    reflection: `day ${i}`,
    milestones: [],
    others: [],
  }));

  it("windows the newest moments and reaches all history page by page", () => {
    expect(visibleMoments(moments, 1)).toHaveLength(TIMELINE_PAGE);
    expect(visibleMoments(moments, 1)[0].date).toBe("2026-07-25");
    expect(hasMoreMoments(moments, 1)).toBe(true);
    expect(visibleMoments(moments, 2)).toHaveLength(2 * TIMELINE_PAGE);
    expect(hasMoreMoments(moments, 2)).toBe(true);
    expect(visibleMoments(moments, 3)).toHaveLength(25);
    expect(hasMoreMoments(moments, 3)).toBe(false);
  });
});
