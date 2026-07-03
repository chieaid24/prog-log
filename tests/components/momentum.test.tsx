// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { prepareMomentum } from "@/components/streak/prepare";
import type { Project } from "@/lib/types";

const getEntryDatesWithProject = vi.fn();
const getAllProjects = vi.fn();
const getUserTimezone = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/queries", () => ({
  getEntryDatesWithProject: (...args: unknown[]) => getEntryDatesWithProject(...args),
  getAllProjects: (...args: unknown[]) => getAllProjects(...args),
  getUserTimezone: (...args: unknown[]) => getUserTimezone(...args),
}));

import { MomentumPanel } from "@/components/streak/momentum-panel";

const TODAY = "2026-07-03";

function project(overrides: Partial<Project>): Project {
  return {
    id: "p1",
    user_id: "u1",
    name: "prog-log",
    category: null,
    status: "active",
    color: "#7c8cf8",
    started: null,
    description: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function pairs(projectId: string, dates: string[]) {
  return dates.map((entry_date) => ({ entry_date, project_id: projectId }));
}

describe("prepareMomentum", () => {
  const projects = [
    project({ id: "turkish", name: "Turkish" }),
    project({ id: "aim", name: "aim" }),
    project({ id: "old", name: "old thing" }),
    project({ id: "gone", name: "archived thing", status: "archived" }),
  ];

  it("computes the global streak and per-project rows with streaks", () => {
    const data = prepareMomentum(
      [
        // Turkish: logged 3 consecutive days ending today → streak 3, rising.
        ...pairs("turkish", ["2026-07-01", "2026-07-02", "2026-07-03"]),
        // aim: one day two weeks back → prev window, cooling.
        ...pairs("aim", ["2026-06-15"]),
        // old: last logged in May → outside the 28-day window, no row.
        ...pairs("old", ["2026-05-01"]),
        // archived: recent but archived, no row.
        ...pairs("gone", ["2026-07-02"]),
      ],
      projects,
      TODAY,
    );

    expect(data.overall.current).toBe(3);
    expect(data.rows.map((r) => r.projectId)).toEqual(["turkish", "aim"]);
    const turkish = data.rows[0];
    expect(turkish.streak).toBe(3);
    expect(turkish.momentum.direction).toBe("rising");
    expect(turkish.momentum.daysLast14).toBe(3);
    const aim = data.rows[1];
    expect(aim.streak).toBe(0);
    expect(aim.momentum.direction).toBe("cooling");
  });

  it("keeps a streak alive when last log was yesterday", () => {
    const data = prepareMomentum(
      pairs("turkish", ["2026-07-01", "2026-07-02"]),
      projects,
      TODAY,
    );
    expect(data.rows[0].streak).toBe(2);
  });

  it("returns no rows for an empty history", () => {
    const data = prepareMomentum([], projects, TODAY);
    expect(data.overall.totalDays).toBe(0);
    expect(data.rows).toEqual([]);
  });
});

describe("<MomentumPanel/>", () => {
  it("renders the streak header and per-project cadence rows", async () => {
    getUserTimezone.mockResolvedValue("UTC");
    getAllProjects.mockResolvedValue([project({ id: "turkish", name: "Turkish" })]);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(new Date());
    const d = (offset: number) => {
      const date = new Date(`${today}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      return date.toISOString().slice(0, 10);
    };
    getEntryDatesWithProject.mockResolvedValue(pairs("turkish", [d(-2), d(-1), d(0)]));

    render(await MomentumPanel());

    expect(screen.getByText("3-day streak")).toBeInTheDocument();
    expect(screen.getByText("Turkish")).toBeInTheDocument();
    expect(screen.getByText("3d run")).toBeInTheDocument();
    expect(screen.getByLabelText("rising")).toBeInTheDocument();
  });

  it("shows the quiet empty state before any logging", async () => {
    getUserTimezone.mockResolvedValue("UTC");
    getAllProjects.mockResolvedValue([]);
    getEntryDatesWithProject.mockResolvedValue([]);

    render(await MomentumPanel());

    expect(screen.getByText("Log a day and your streak starts counting.")).toBeInTheDocument();
  });
});
