// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveHeatmapRange } from "@/components/heatmap/grid";
import { LEVEL_FILL, YearHeatmap } from "@/components/heatmap/year-heatmap";
import type { HeatmapCell } from "@/lib/types";

const TODAY = "2026-07-03";

function cell(date: string, weight: number, entries = 1): HeatmapCell {
  return { date, weight, entries };
}

describe("YearHeatmap", () => {
  it("exposes exactly the four DESIGN.md heat tokens", () => {
    expect(LEVEL_FILL).toEqual([
      "var(--heat-0)",
      "var(--heat-1)",
      "var(--heat-2)",
      "var(--heat-3)",
    ]);
  });

  it("fills days by weight and marks today without making cells interactive", () => {
    const { container } = render(
      <YearHeatmap
        cells={[cell("2026-07-01", 1), cell("2026-07-02", 3), cell(TODAY, 7)]}
        todayISO={TODAY}
      />,
    );
    const byDate = (date: string) => container.querySelector(`rect[data-date="${date}"]`)!;
    expect(byDate("2026-07-01")).toHaveAttribute("fill", "var(--heat-1)");
    expect(byDate("2026-07-02")).toHaveAttribute("fill", "var(--heat-2)");
    expect(byDate(TODAY)).toHaveAttribute("fill", "var(--heat-3)");
    expect(byDate(TODAY)).toHaveAttribute("stroke", "var(--ink)");
    expect(container.querySelector('rect[role="button"]')).toBeNull();
    expect(container.querySelector("rect[tabindex]")).toBeNull();
    expect(container.querySelector("rect[onclick]")).toBeNull();
    expect(byDate("2026-07-02").querySelector("title")?.textContent).toContain(
      "July 2, 2026: 1 entry, weight 3",
    );
  });

  it("keeps the full SVG fit to width without a scroll container", () => {
    render(<YearHeatmap cells={[]} todayISO={TODAY} />);
    const fit = screen.getByTestId("heatmap-fit");
    const svg = fit.querySelector("svg")!;
    expect(fit).toHaveClass("w-full");
    expect(fit).not.toHaveClass("overflow-x-auto");
    expect(svg).toHaveAttribute("viewBox");
    expect(svg).toHaveClass("w-full", "h-auto");
    expect(svg.style.maxWidth).not.toBe("");
  });

  it("puts year navigation and the view toggle inside the header", () => {
    render(<YearHeatmap cells={[]} todayISO={TODAY} calendarMonth="2026-07-01" />);
    const heading = screen.getByRole("heading", { name: "Recent activity" });
    const header = heading.closest("header")!;
    expect(within(header).getByRole("navigation", { name: "Heatmap year navigation" })).toBeTruthy();
    const toggle = within(header).getByRole("navigation", { name: "Daily log view" });
    expect(within(toggle).getByRole("link", { name: "Heatmap" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(toggle).getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href",
      "/?view=calendar&month=2026-07",
    );
  });

  it("supports a fixed detail view without daily-log controls", () => {
    render(
      <YearHeatmap
        cells={[]}
        todayISO={TODAY}
        title="Year heatmap"
        showControls={false}
        emptyMessage="Nothing logged for this Project in the trailing year."
      />,
    );
    expect(screen.getByRole("heading", { name: "Year heatmap" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Heatmap year navigation" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Daily log view" })).toBeNull();
    expect(screen.getByText("Nothing logged for this Project in the trailing year.")).toBeTruthy();
  });

  it("pages historical years forward without moving beyond today", () => {
    const { rerender } = render(
      <YearHeatmap
        cells={[]}
        todayISO={TODAY}
        range={resolveHeatmapRange(TODAY, "2024")}
      />,
    );
    expect(screen.getByRole("link", { name: "Show 2023" })).toHaveAttribute(
      "href",
      "/?view=heatmap&year=2023",
    );
    expect(screen.getByRole("link", { name: "Show next year" })).toHaveAttribute(
      "href",
      "/?view=heatmap&year=2025",
    );

    rerender(
      <YearHeatmap
        cells={[]}
        todayISO={TODAY}
        range={resolveHeatmapRange(TODAY, "2025")}
      />,
    );
    expect(screen.getByRole("link", { name: "Show next year" })).toHaveAttribute(
      "href",
      "/?view=heatmap",
    );
  });

  it("shows the waiting frog only while the range is empty", () => {
    const { container, rerender } = render(<YearHeatmap cells={[]} todayISO={TODAY} />);
    expect(screen.getByText(/Ferdy is waiting for your first Entry/)).toBeTruthy();
    expect(container.querySelector('[data-testid="frog"]')).not.toBeNull();

    rerender(<YearHeatmap cells={[cell("2026-07-01", 2)]} todayISO={TODAY} />);
    expect(screen.queryByText(/Ferdy is waiting/)).toBeNull();
    expect(container.querySelector('[data-testid="frog"]')).toBeNull();
  });
});
