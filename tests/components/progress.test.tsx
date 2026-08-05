// @vitest-environment jsdom
// The Progress view (ADR-0023): page assembly (timeline + overview + retained
// monthly analytics off one all-time fetch), the load-more reveal, the Ferdy
// empty state, and the /monthly redirect.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProgressPage from "@/app/(log)/progress/page";
import { CumulativeEffort } from "@/components/progress/cumulative-effort";
import { ProgressTimeline } from "@/components/progress/timeline";
import type { TimelineMoment } from "@/components/progress/prepare";
import type { EntryWithProject } from "@/lib/types";
import nextConfig from "@/next.config";

const getAllEntries = vi.fn();
const getThrowbackPool = vi.fn();
const getToday = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));
vi.mock("@/lib/queries", () => ({
  getAllEntries: (...args: unknown[]) => getAllEntries(...args),
  getThrowbackPool: (...args: unknown[]) => getThrowbackPool(...args),
  getToday: (...args: unknown[]) => getToday(...args),
}));

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

afterEach(() => {
  vi.clearAllMocks();
});

describe("progress page", () => {
  it("renders the timeline, overview and retained monthly analytics", async () => {
    getToday.mockResolvedValue("2026-06-20");
    getAllEntries.mockResolvedValue([
      entry({ entry_date: "2026-05-04", milestone: "wired the schema" }),
      entry({ entry_date: "2026-05-04", time_spent: "large" }),
      entry({
        entry_date: "2026-06-02",
        project: { id: "p2", name: "Turkish", color: "#34d399", category: null, status: "active" },
      }),
    ]);
    getThrowbackPool.mockResolvedValue([
      { kind: "reflection", reflection: "kept the streak alive", entryDate: "2026-06-20", daysAgo: 0 },
    ]);

    render(
      await ProgressPage({ searchParams: Promise.resolve({ month: "2026-05" }) }),
    );

    expect(screen.getByRole("heading", { name: "Progress" })).toBeInTheDocument();
    // Today's Reflection is included: the pool is asked with tomorrow's cutoff.
    expect(getThrowbackPool).toHaveBeenCalledWith({}, "2026-06-21");

    // Timeline: the Milestone day and the Reflection day; the plain 2026-06-02
    // day is absent.
    const timeline = screen.getByRole("region", { name: "Progress timeline" });
    expect(within(timeline).getAllByRole("article")).toHaveLength(2);
    expect(within(timeline).getByText("kept the streak alive")).toBeInTheDocument();
    expect(within(timeline).getByText("wired the schema")).toBeInTheDocument();
    expect(within(timeline).queryByText("Turkish Medium")).not.toBeInTheDocument();

    // Overview: streak values and the cumulative total (2 + 3 + 2 = 7) over
    // the 48-day span from the first logged day through today.
    expect(screen.getByText("longest 1")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Cumulative effort over 48 days, 7 total weight" }),
    ).toBeInTheDocument();

    // Retained monthly analytics for the requested month, unchanged numbers.
    // (The timeline's May bucket header also reads "May 2026", so scope to
    // the analytics region.)
    const monthly = screen.getByRole("region", { name: "Monthly analytics" });
    expect(within(monthly).getByRole("heading", { name: "May 2026" })).toBeInTheDocument();
    expect(screen.getByText("Days worked").nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("Entries").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: "This month" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous month" })).toHaveAttribute(
      "href",
      "/progress?month=2026-04",
    );
    expect(screen.getByRole("link", { name: "Next month" })).toHaveAttribute(
      "href",
      "/progress?month=2026-06",
    );
  });

  it("shows the Ferdy empty state when no Reflections or Milestones exist", async () => {
    getToday.mockResolvedValue("2026-06-20");
    // Plain logged days only: they never become moments.
    getAllEntries.mockResolvedValue([entry({ entry_date: "2026-06-02" })]);
    getThrowbackPool.mockResolvedValue([]);

    render(await ProgressPage({ searchParams: Promise.resolve({}) }));

    const timeline = screen.getByRole("region", { name: "Progress timeline" });
    expect(within(timeline).getByTestId("frog")).toBeInTheDocument();
    expect(
      within(timeline).getByText(/No Reflections or Milestones yet/),
    ).toBeInTheDocument();
    expect(within(timeline).queryByRole("article")).not.toBeInTheDocument();
  });
});

describe("progress timeline load-more", () => {
  const moments: TimelineMoment[] = Array.from({ length: 25 }, (_, i) => ({
    date: `2026-07-${String(25 - i).padStart(2, "0")}`,
    header: "July 2026",
    reflection: `moment ${i}`,
    milestones: [],
    others: [],
  }));

  it("reveals an initial window and reaches all history", async () => {
    const user = userEvent.setup();
    render(<ProgressTimeline moments={moments} />);

    expect(screen.getAllByRole("article")).toHaveLength(10);
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(screen.getAllByRole("article")).toHaveLength(20);
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(screen.getAllByRole("article")).toHaveLength(25);
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("renders a header once per bucket", () => {
    render(
      <ProgressTimeline
        moments={[
          { date: "2026-06-19", header: "This week", reflection: "a", milestones: [], others: [] },
          { date: "2026-06-18", header: "This week", reflection: "b", milestones: [], others: [] },
          { date: "2026-05-30", header: "May 2026", reflection: "c", milestones: [], others: [] },
        ]}
      />,
    );
    expect(screen.getAllByRole("heading", { name: "This week" })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { name: "May 2026" })).toHaveLength(1);
  });
});

describe("cumulative effort card", () => {
  it("stays quiet with no history", () => {
    render(
      <CumulativeEffort
        points={[]}
        streaks={{ current: 0, longest: 0, totalDays: 0, lastLogged: null }}
      />,
    );
    expect(
      screen.getByText("Log your first Entry and the curve starts climbing."),
    ).toBeInTheDocument();
  });
});

describe("/monthly redirect", () => {
  it("forwards the old route to /progress", async () => {
    const redirects = await nextConfig.redirects?.();
    expect(redirects).toContainEqual(
      expect.objectContaining({ source: "/monthly", destination: "/progress" }),
    );
  });
});
