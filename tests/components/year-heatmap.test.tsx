// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HeatmapCell } from "@/lib/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { LEVEL_FILL, YearHeatmap } from "@/components/heatmap/year-heatmap";

const TODAY = "2026-07-03";

function cell(date: string, weight: number, entries = 1): HeatmapCell {
  return { date, weight, entries };
}

describe("YearHeatmap heat ramp", () => {
  it("exposes exactly the four DESIGN.md heat tokens, in ramp order", () => {
    expect(LEVEL_FILL).toEqual([
      "var(--heat-0)",
      "var(--heat-1)",
      "var(--heat-2)",
      "var(--heat-3)",
    ]);
  });

  it("fills days by bucketed weight and marks selection in ink", () => {
    const { container } = render(
      <YearHeatmap
        cells={[cell("2026-07-01", 1), cell("2026-07-02", 3), cell("2026-07-03", 7)]}
        todayISO={TODAY}
        selectedDay="2026-07-02"
      />,
    );
    const byDate = (d: string) => container.querySelector(`rect[data-date="${d}"]`)!;
    expect(byDate("2026-07-01").getAttribute("fill")).toBe("var(--heat-1)");
    expect(byDate("2026-07-02").getAttribute("fill")).toBe("var(--heat-2)");
    expect(byDate("2026-07-03").getAttribute("fill")).toBe("var(--heat-3)");
    expect(byDate("2026-06-30").getAttribute("fill")).toBe("var(--heat-0)");
    expect(byDate("2026-07-02").getAttribute("stroke")).toBe("var(--ink)");
    expect(byDate("2026-07-01").getAttribute("stroke")).toBe("transparent");
  });

  it("shows the waiting frog only while the year is empty", () => {
    const { container, rerender } = render(<YearHeatmap cells={[]} todayISO={TODAY} />);
    expect(screen.getByText(/Ferdy is waiting for your first Entry/)).toBeTruthy();
    expect(container.querySelector('[data-testid="frog"]')).not.toBeNull();

    rerender(<YearHeatmap cells={[cell("2026-07-01", 2)]} todayISO={TODAY} />);
    expect(screen.queryByText(/Ferdy is waiting/)).toBeNull();
    expect(container.querySelector('[data-testid="frog"]')).toBeNull();
  });
});
