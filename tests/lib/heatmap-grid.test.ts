import { describe, expect, it } from "vitest";
import {
  buildHeatmapGrid,
  resolveHeatmapRange,
} from "@/components/heatmap/grid";

describe("heatmap ranges", () => {
  it("defaults to 365 days ending today", () => {
    expect(resolveHeatmapRange("2026-07-03")).toEqual({
      start: "2025-07-04",
      end: "2026-07-03",
      year: null,
    });
  });

  it("resolves prior years to complete calendar years", () => {
    expect(resolveHeatmapRange("2026-07-03", "2024")).toEqual({
      start: "2024-01-01",
      end: "2024-12-31",
      year: 2024,
    });
  });

  it("rejects the current year, future years, and malformed values", () => {
    for (const value of ["0001", "2026", "2027", "26", "nope"]) {
      const range = resolveHeatmapRange("2026-07-03", value);
      expect(range.year).toBeNull();
      expect(range.end).toBe("2026-07-03");
    }
  });
});

describe("buildHeatmapGrid", () => {
  it("shows only the requested trailing range and no future days", () => {
    const range = resolveHeatmapRange("2026-07-03");
    const days = buildHeatmapGrid(range).flatMap((column) => column.days);
    expect(days[0]).toBe("2025-07-04");
    expect(days.at(-1)).toBe("2026-07-03");
    expect(days).toHaveLength(365);
    expect(new Set(days).size).toBe(days.length);
    expect(days).not.toContain("2026-07-04");
  });

  it("covers every day in a leap calendar year", () => {
    const days = buildHeatmapGrid(resolveHeatmapRange("2026-07-03", "2024")).flatMap(
      (column) => column.days,
    );
    expect(days[0]).toBe("2024-01-01");
    expect(days.at(-1)).toBe("2024-12-31");
    expect(days).toHaveLength(366);
    expect(days).toContain("2024-02-29");
  });

  it("aligns columns to Sunday while clipping cells to the range", () => {
    const columns = buildHeatmapGrid(resolveHeatmapRange("2026-07-03", "2025"));
    for (const column of columns) {
      expect(new Date(`${column.weekStart}T00:00:00Z`).getUTCDay()).toBe(0);
    }
    expect(columns[0].weekStart).toBe("2024-12-29");
    expect(columns[0].days[0]).toBe("2025-01-01");
    expect(columns.at(-1)?.days.at(-1)).toBe("2025-12-31");
  });

  it("places each month label once without a leading collision", () => {
    const labels = buildHeatmapGrid(resolveHeatmapRange("2026-07-03", "2025"))
      .map((column) => column.monthLabel)
      .filter(Boolean);
    expect(labels).toEqual([
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]);
  });
});
