import { describe, expect, it } from "vitest";
import {
  NOW_MILESTONES_PER_PROJECT,
  prepareNowItems,
  shortDate,
  type NowSourceEntry,
} from "@/lib/now";

const TODAY = "2026-07-03";

function entry(overrides: Partial<NowSourceEntry> = {}): NowSourceEntry {
  return {
    entryDate: "2026-07-01",
    timeSpent: "large",
    milestone: null,
    projectName: "prog-log",
    category: "coding",
    color: "#7c8cf8",
    ...overrides,
  };
}

describe("prepareNowItems", () => {
  it("keeps only window entries that carry a milestone or a large time commitment", () => {
    const items = prepareNowItems(
      [
        entry({ entryDate: "2026-07-02", timeSpent: "small" }), // no signal
        entry({ entryDate: "2026-07-01", timeSpent: "small", milestone: "shipped v1" }),
        entry({ entryDate: "2026-05-04", timeSpent: "large" }), // in window (60d)
        entry({ entryDate: "2026-05-03", timeSpent: "large" }), // out of window
        entry({ entryDate: "2026-07-04", timeSpent: "large" }), // future
      ],
      TODAY,
    );
    expect(items).toHaveLength(1);
    expect(items[0].milestones).toEqual([{ text: "shipped v1", date: "2026-07-01" }]);
    expect(items[0].deepWorkDays).toBe(1);
    expect(items[0].lastActiveDate).toBe("2026-07-01");
    expect(items[0].daysSinceActive).toBe(2);
  });

  it("groups per project case-insensitively and orders by freshest activity", () => {
    const items = prepareNowItems(
      [
        entry({ projectName: "Turkish", entryDate: "2026-06-20", milestone: "100 words" }),
        entry({ projectName: "turkish", entryDate: "2026-06-28", timeSpent: "large" }),
        entry({ projectName: "AI-M", entryDate: "2026-07-02", milestone: "beta out" }),
      ],
      TODAY,
    );
    expect(items.map((p) => p.projectName)).toEqual(["AI-M", "Turkish"]);
    expect(items[1].lastActiveDate).toBe("2026-06-28");
    expect(items[1].milestones).toEqual([{ text: "100 words", date: "2026-06-20" }]);
  });

  it("caps milestones per project, newest first", () => {
    const milestones = ["a", "b", "c", "d"].map((text, i) =>
      entry({ milestone: text, entryDate: `2026-06-2${i}`, timeSpent: "small" }),
    );
    const items = prepareNowItems(milestones, TODAY);
    expect(items[0].milestones).toHaveLength(NOW_MILESTONES_PER_PROJECT);
    expect(items[0].milestones.map((m) => m.text)).toEqual(["d", "c", "b"]);
  });

  it("breaks activity ties by milestone count then name", () => {
    const items = prepareNowItems(
      [
        entry({ projectName: "zeta", entryDate: "2026-07-01", timeSpent: "large" }),
        entry({ projectName: "alpha", entryDate: "2026-07-01", timeSpent: "large" }),
        entry({
          projectName: "mid",
          entryDate: "2026-07-01",
          timeSpent: "small",
          milestone: "hit",
        }),
      ],
      TODAY,
    );
    expect(items.map((p) => p.projectName)).toEqual(["mid", "alpha", "zeta"]);
  });

  it("returns empty for no input", () => {
    expect(prepareNowItems([], TODAY)).toEqual([]);
  });
});

describe("shortDate", () => {
  it("formats an ISO date compactly, UTC-safe", () => {
    expect(shortDate("2026-07-01")).toBe("Jul 1");
    expect(shortDate("2026-12-31")).toBe("Dec 31");
  });
});
