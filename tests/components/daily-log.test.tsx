// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/(log)/page";

const getEntriesInRange = vi.fn();
const getActiveProjects = vi.fn();
const getDayReflection = vi.fn();
const getToday = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));
vi.mock("@/lib/queries", () => ({
  getEntriesInRange: (...args: unknown[]) => getEntriesInRange(...args),
  getActiveProjects: (...args: unknown[]) => getActiveProjects(...args),
  getDayReflection: (...args: unknown[]) => getDayReflection(...args),
  getToday: (...args: unknown[]) => getToday(...args),
}));
vi.mock("@/components/day-detail/day-detail", () => ({
  DayDetail: ({ date }: { date: string }) => <div data-testid="day-detail">{date}</div>,
}));
vi.mock("@/components/quick-add/log-sheet", () => ({
  LogSheet: () => <div data-testid="log-sheet" />,
}));
vi.mock("@/components/quick-add/quick-add-form", () => ({
  QuickAddForm: () => <div data-testid="quick-add" />,
}));
vi.mock("@/components/streak/momentum-panel", () => ({
  MomentumPanel: () => <div data-testid="momentum" />,
}));
vi.mock("@/components/throwback/throwback-feed", () => ({
  ThrowbackFeed: () => <div data-testid="throwback" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  getToday.mockResolvedValue("2026-08-03");
  getEntriesInRange.mockResolvedValue([]);
  getActiveProjects.mockResolvedValue([]);
  getDayReflection.mockResolvedValue(null);
});

describe("daily log views", () => {
  it("opens on the calendar with its toggle inside the wrapping header", async () => {
    render(await DashboardPage({ searchParams: Promise.resolve({}) }));

    const section = screen.getByRole("region", { name: "Month calendar" });
    const heading = within(section).getByRole("heading", { name: "August 2026" });
    const header = heading.closest("header")!;
    const toggle = within(header).getByRole("navigation", { name: "Daily log view" });
    expect(within(toggle).getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getAllByRole("navigation", { name: "Daily log view" })).toHaveLength(1);
    expect(header).toHaveClass("flex-wrap");
    expect(getEntriesInRange).toHaveBeenCalledWith({}, "2026-07-25", "2026-09-07");
  });

  it("loads a complete historical year and keeps calendar state in the header toggle", async () => {
    render(
      await DashboardPage({
        searchParams: Promise.resolve({
          view: "heatmap",
          year: "2025",
          month: "2026-05",
          day: "2026-05-10",
        }),
      }),
    );

    const section = screen.getByRole("region", { name: "Year heatmap" });
    const header = within(section).getByRole("heading", { name: "Recent activity" }).closest(
      "header",
    )!;
    const toggle = within(header).getByRole("navigation", { name: "Daily log view" });
    expect(within(toggle).getByRole("link", { name: "Heatmap" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(toggle).getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href",
      "/?view=calendar&month=2026-05&day=2026-05-10",
    );
    expect(getEntriesInRange).toHaveBeenCalledWith({}, "2025-01-01", "2025-12-31");
    expect(screen.queryByTestId("day-detail")).toBeNull();
  });

  it("opens day detail only from the calendar", async () => {
    render(
      await DashboardPage({
        searchParams: Promise.resolve({
          view: "calendar",
          month: "2026-05",
          day: "2026-05-10",
        }),
      }),
    );

    expect(screen.getByTestId("day-detail")).toHaveTextContent("2026-05-10");
  });
});
