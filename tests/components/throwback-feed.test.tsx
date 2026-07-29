// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThrowbackFeed } from "@/components/throwback/throwback-feed";
import { humanizeAge, pickThrowbacks } from "@/lib/throwbacks";
import type { MilestoneThrowback, ThrowbackItem } from "@/lib/types";

const getThrowbackPool = vi.fn();
const getToday = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));
vi.mock("@/lib/queries", () => ({
  getThrowbackPool: (...args: unknown[]) => getThrowbackPool(...args),
  getToday: (...args: unknown[]) => getToday(...args),
}));

function item(entryId: string, milestone: string, daysAgo: number): MilestoneThrowback {
  return {
    kind: "milestone",
    entryId,
    milestone,
    entryDate: "2026-01-01",
    projectName: "AI-M",
    color: "#7c8cf8",
    daysAgo,
  };
}

const POOL = [
  item("e1", "shipped the schema", 400),
  item("e2", "first heatmap render", 90),
  item("e3", "magic-link login worked", 30),
  item("e4", "quick add in production", 7),
  item("e5", "calendar banners done", 2),
];

// Fixed today: 2026-06-20 in the stored timezone.
beforeEach(() => {
  getToday.mockResolvedValue("2026-06-20");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("throwback feed", () => {
  it("renders the date-seeded top 3 in pick order with humanized ages", async () => {
    getThrowbackPool.mockResolvedValue(POOL);
    render(await ThrowbackFeed());

    // The pool is fetched for today in the stored timezone.
    expect(getThrowbackPool).toHaveBeenCalledWith({}, "2026-06-20");

    // Exactly the library's stable pick for that date, in the same order —
    // the same contract the Discord digest leans on for its single item.
    const expected = pickThrowbacks(POOL, "2026-06-20");
    expect(expected).toHaveLength(3);
    const rendered = screen.getAllByRole("listitem");
    expect(rendered).toHaveLength(3);
    expected.forEach((want, i) => {
      expect(want.kind).toBe("milestone");
      if (want.kind !== "milestone") throw new Error("expected milestone fixture");
      expect(rendered[i]).toHaveTextContent(want.milestone);
      expect(rendered[i]).toHaveTextContent(humanizeAge(want.daysAgo));
      expect(rendered[i]).toHaveTextContent(want.projectName);
    });
  });

  it("is stable across re-renders on the same day", async () => {
    getThrowbackPool.mockResolvedValue(POOL);
    const first = render(await ThrowbackFeed());
    const firstTexts = first
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    first.unmount();

    const second = render(await ThrowbackFeed());
    expect(second.getAllByRole("listitem").map((li) => li.textContent)).toEqual(firstTexts);
  });

  it("shows a quiet empty state when no Milestones exist yet", async () => {
    getThrowbackPool.mockResolvedValue([]);
    render(await ThrowbackFeed());
    expect(
      screen.getByText("Milestones and reflections will resurface here on future days."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("renders a reflection distinctly without a project accent", async () => {
    getThrowbackPool.mockResolvedValue([
      {
        kind: "reflection",
        reflection: "proud of untangling the query seam",
        entryDate: "2025-06-20",
        daysAgo: 365,
      } satisfies ThrowbackItem,
    ]);
    render(await ThrowbackFeed());

    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("proud of untangling the query seam");
    expect(item).toHaveTextContent("Daily reflection");
    expect(item).toHaveTextContent("1 year ago");
    expect(item.querySelector("[style]")).toBeNull();
  });
});
