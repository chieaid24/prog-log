// @vitest-environment jsdom
// The monthly analytics components, retained beneath the Progress timeline
// (ADR-0023); page-level assembly is covered by tests/components/progress.test.tsx.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EffortTrend } from "@/components/monthly/effort-trend";
import { MilestoneList } from "@/components/monthly/milestone-list";
import { ProjectShare } from "@/components/monthly/project-share";
import { ProjectStack } from "@/components/monthly/project-stack";
import { StatTiles } from "@/components/monthly/stat-tiles";
import { WeekdayPattern } from "@/components/monthly/weekday-pattern";
import {
  buildShareSegments,
  buildStackRows,
  buildWeekdayRows,
} from "@/components/monthly/prepare";
import type { TrendPoint } from "@/lib/rollups";

describe("stat tiles", () => {
  it("shows the month's headline numbers and split", () => {
    render(
      <StatTiles
        stat={{ month: "2026-06-01", daysWorked: 12, entries: 18, largeSessions: 4, milestones: 3 }}
        split={{ small: 6, medium: 8, large: 4 }}
      />,
    );
    expect(screen.getByText("Days worked").nextElementSibling).toHaveTextContent("12");
    expect(screen.getByText("Milestones").nextElementSibling).toHaveTextContent("3");
    expect(
      screen.getByRole("img", { name: "Small 6, Medium 8, Large 4" }),
    ).toBeInTheDocument();
  });

  it("keeps zero tiles and quiets the split when the month is empty", () => {
    render(
      <StatTiles
        stat={{ month: "2026-06-01", daysWorked: 0, entries: 0, largeSessions: 0, milestones: 0 }}
        split={{ small: 0, medium: 0, large: 0 }}
      />,
    );
    expect(screen.getByText("No Entries this month.")).toBeInTheDocument();
  });
});

describe("project stack", () => {
  it("mirrors every row in the accessible table", () => {
    render(
      <ProjectStack
        rows={buildStackRows([
          {
            projectId: "p1",
            projectName: "AI-M",
            color: "#7c8cf8",
            counts: { small: 2, medium: 3, large: 1 },
          },
          {
            projectId: "p2",
            projectName: "Turkish",
            color: "#34d399",
            counts: { small: 4, medium: 0, large: 0 },
          },
        ])}
      />,
    );
    const table = screen.getByRole("table", {
      name: "Entries per Project by Time Commitment",
    });
    expect(within(table).getByRole("row", { name: "AI-M 2 3 1" })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: "Turkish 4 0 0" })).toBeInTheDocument();
  });

  it("shows the empty state without a chart", () => {
    render(<ProjectStack rows={[]} />);
    expect(screen.getByText("No Entries this month.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("project share", () => {
  it("direct-labels every segment with its percent", () => {
    render(
      <ProjectShare
        segments={buildShareSegments([
          { projectId: "p1", projectName: "AI-M", color: "#7c8cf8", weight: 9, share: 0.75 },
          { projectId: "p2", projectName: "Turkish", color: "#34d399", weight: 3, share: 0.25 },
        ])}
      />,
    );
    expect(screen.getByRole("img", { name: "AI-M 75%, Turkish 25%" })).toBeInTheDocument();
    expect(screen.getByText("AI-M")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });
});

describe("weekday pattern", () => {
  it("labels only the peak weekday with its count", () => {
    const rows = buildWeekdayRows([
      { weekday: 0, entries: 2, weight: 4 },
      { weekday: 1, entries: 5, weight: 9 },
      { weekday: 2, entries: 1, weight: 1 },
      { weekday: 3, entries: 0, weight: 0 },
      { weekday: 4, entries: 0, weight: 0 },
      { weekday: 5, entries: 0, weight: 0 },
      { weekday: 6, entries: 0, weight: 0 },
    ]);
    render(<WeekdayPattern rows={rows} />);
    expect(screen.getByText("5 Entries")).toBeInTheDocument();
    expect(screen.queryByText("2 Entries")).not.toBeInTheDocument();
  });
});

describe("effort trend", () => {
  const points: TrendPoint[] = [
    { date: "2026-05-31", weight: 0, rolling: 0 },
    { date: "2026-06-01", weight: 3, rolling: 1.5 },
    { date: "2026-06-02", weight: 1, rolling: 1.3 },
  ];

  it("draws a bar per logged day and reports the latest rolling average", () => {
    const { container } = render(<EffortTrend points={points} />);
    expect(container.querySelectorAll("rect")).toHaveLength(2);
    expect(screen.getByText("1.3")).toBeInTheDocument();
  });

  it("quiet when the whole window is zero", () => {
    render(
      <EffortTrend
        points={[
          { date: "2026-06-01", weight: 0, rolling: 0 },
          { date: "2026-06-02", weight: 0, rolling: 0 },
        ]}
      />,
    );
    expect(screen.getByText("Nothing logged in the last 90 days.")).toBeInTheDocument();
  });

  it("keeps a month tick near the left edge inside the viewBox", () => {
    // A 90-day window starting on the 1st puts a month tick at index 0;
    // unclamped, its centered label would clip at x=0 ("May" -> "ay").
    const window: TrendPoint[] = Array.from({ length: 90 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 4, 1) + i * 24 * 60 * 60 * 1000);
      return { date: d.toISOString().slice(0, 10), weight: 1, rolling: 1 };
    });
    const { container } = render(<EffortTrend points={window} />);
    const labels = [...container.querySelectorAll("text")];
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(Number(label.getAttribute("x"))).toBeGreaterThanOrEqual(16);
      expect(Number(label.getAttribute("x"))).toBeLessThanOrEqual(720 - 16);
    }
  });
});

describe("milestone list", () => {
  it("renders date, project chip and milestone text in order", () => {
    render(
      <MilestoneList
        rows={[
          {
            entryId: "e1",
            date: "2026-06-03",
            projectName: "AI-M",
            color: "#7c8cf8",
            milestone: "shipped the heatmap",
          },
          {
            entryId: "e2",
            date: "2026-06-10",
            projectName: "Turkish",
            color: "#34d399",
            milestone: "first full conversation",
          },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Jun 3");
    expect(items[0]).toHaveTextContent("AI-M");
    expect(items[0]).toHaveTextContent("shipped the heatmap");
    expect(items[1]).toHaveTextContent("first full conversation");
  });

  it("shows the quiet empty state", () => {
    render(<MilestoneList rows={[]} />);
    expect(screen.getByText("No Milestones this month.")).toBeInTheDocument();
  });
});

