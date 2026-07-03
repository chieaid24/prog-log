// Grid math for the trailing-year heatmap: coverage, Sunday-first alignment,
// and the month-label placement rules (incl. the stub-first-column collision).
import { describe, expect, it } from "vitest";
import { buildHeatmapGrid } from "@/components/heatmap/grid";

describe("buildHeatmapGrid", () => {
  it("covers exactly the trailing 365 days and ends today", () => {
    const cols = buildHeatmapGrid("2026-07-03");
    const days = cols.flatMap((c) => c.days);
    expect(days[0] <= "2025-07-04").toBe(true);
    expect(days[days.length - 1]).toBe("2026-07-03");
    expect(new Set(days).size).toBe(days.length);
  });

  it("starts every column on a Sunday and stops the last at today", () => {
    const cols = buildHeatmapGrid("2026-07-03");
    for (const col of cols) {
      expect(new Date(col.weekStart + "T00:00:00Z").getUTCDay()).toBe(0);
    }
    // 2026-07-03 is a Friday: the final column holds Sun..Fri = 6 days.
    expect(cols[cols.length - 1].days).toHaveLength(6);
  });

  it("labels a column when its month differs from the previous column", () => {
    const cols = buildHeatmapGrid("2026-07-03");
    const labels = cols.map((c) => c.monthLabel).filter(Boolean);
    // A trailing year crosses 12 month boundaries at most once each.
    expect(labels.length).toBeGreaterThanOrEqual(11);
    expect(labels.length).toBeLessThanOrEqual(13);
    expect(new Set(labels).size).toBe(labels.length === 13 ? 12 : labels.length);
  });

  it("drops the stub first column's label so it cannot collide with the next month", () => {
    // Grid for 2026-07-03 opens on Sun 2025-06-28; June is a one-column stub
    // and July starts on the very next column.
    const cols = buildHeatmapGrid("2026-07-03");
    expect(cols[0].monthLabel).toBeNull();
    expect(cols[1].monthLabel).toBe("Jul");
  });

  it("keeps the first column's label when its month spans multiple columns", () => {
    // Grid for 2026-06-27 opens on Sun 2025-06-22, and 2025-06-29 is still
    // June — no collision, the label stays.
    const cols = buildHeatmapGrid("2026-06-27");
    expect(cols[0].monthLabel).toBe("Jun");
    expect(cols[1].monthLabel).toBeNull();
  });
});
