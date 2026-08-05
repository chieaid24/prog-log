// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjectDetailPage from "@/app/(log)/projects/[id]/page";
import type { EntryWithProject, Project } from "@/lib/types";

const getAllProjects = vi.fn();
const getAllEntries = vi.fn();
const getToday = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));
vi.mock("@/lib/queries", () => ({
  getAllProjects: (...args: unknown[]) => getAllProjects(...args),
  getAllEntries: (...args: unknown[]) => getAllEntries(...args),
  getToday: (...args: unknown[]) => getToday(...args),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

function project(id: string, name: string, category: string | null = "Work"): Project {
  return {
    id,
    user_id: "u1",
    name,
    category,
    status: "active",
    color: "#339797",
    started: null,
    description: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

function entry(
  id: string,
  date: string,
  time: EntryWithProject["time_spent"],
  p: Project,
  milestone: string | null = null,
): EntryWithProject {
  return {
    id,
    user_id: "u1",
    project_id: p.id,
    entry_date: date,
    time_spent: time,
    milestone,
    description: null,
    created_at: `${date}T12:00:00Z`,
    project: { id: p.id, name: p.name, color: p.color, category: p.category, status: p.status },
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("project detail page", () => {
  it("renders project-scoped charts, split, and chronological Milestones", async () => {
    const aim = project("p1", "AI-M", "Research");
    const other = project("p2", "Turkish", "Learning");
    getAllProjects.mockResolvedValue([aim, other]);
    getToday.mockResolvedValue("2026-08-03");
    getAllEntries.mockResolvedValue([
      entry("e2", "2026-08-02", "medium", aim, "second release"),
      entry("other", "2026-08-01", "large", other, "must stay hidden"),
      entry("e1", "2026-08-01", "small", aim, "first release"),
      entry("e3", "2026-08-03", "large", aim),
    ]);

    const { container } = render(
      await ProjectDetailPage({ params: Promise.resolve({ id: "p1" }) }),
    );

    expect(screen.getByRole("heading", { name: "AI-M" })).toBeInTheDocument();
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByTestId("project-color")).toHaveStyle({ background: "#339797" });
    expect(screen.getByRole("heading", { name: "Year heatmap" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Effort trend" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Time Commitment split" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Milestone timeline" })).toBeInTheDocument();

    const firstDay = container.querySelector('rect[data-date="2026-08-01"]');
    expect(firstDay).toHaveAttribute("fill", "var(--heat-1)");
    expect(screen.queryByText("must stay hidden")).not.toBeInTheDocument();

    const split = screen.getByRole("table", {
      name: "All-time Time Commitment split for this Project",
    });
    const small = within(split).getByRole("rowheader", { name: "Small" }).closest("tr")!;
    expect(within(small).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "1",
      "33%",
    ]);

    const timeline = screen.getByRole("region", { name: "Milestone timeline" });
    const milestones = within(timeline).getAllByRole("listitem");
    expect(milestones[0]).toHaveTextContent("August 1, 2026");
    expect(milestones[0]).toHaveTextContent("2 days ago");
    expect(milestones[0]).toHaveTextContent("first release");
    expect(milestones[1]).toHaveTextContent("August 2, 2026");
    expect(milestones[1]).toHaveTextContent("yesterday");
    expect(milestones[1]).toHaveTextContent("second release");
  });

  it("shows one clean empty state for a Project without Entries", async () => {
    const aim = project("p1", "AI-M");
    const other = project("p2", "Turkish");
    getAllProjects.mockResolvedValue([aim, other]);
    getToday.mockResolvedValue("2026-08-03");
    getAllEntries.mockResolvedValue([entry("other", "2026-08-01", "large", other)]);

    render(await ProjectDetailPage({ params: Promise.resolve({ id: "p1" }) }));

    const empty = screen.getByRole("region", { name: "Empty Project" });
    expect(within(empty).getByTestId("frog")).toBeInTheDocument();
    expect(within(empty).getByText(/No Entries yet/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Year heatmap" })).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("keeps the timeline quiet when Entries have no Milestones", async () => {
    const aim = project("p1", "AI-M");
    getAllProjects.mockResolvedValue([aim]);
    getToday.mockResolvedValue("2026-08-03");
    getAllEntries.mockResolvedValue([entry("e1", "2026-08-03", "small", aim)]);

    render(await ProjectDetailPage({ params: Promise.resolve({ id: "p1" }) }));

    const timeline = screen.getByRole("region", { name: "Milestone timeline" });
    expect(within(timeline).getByText("No Milestones yet.")).toBeInTheDocument();
    expect(within(timeline).queryByRole("list")).not.toBeInTheDocument();
  });

  it("returns not found for an unknown Project id", async () => {
    getAllProjects.mockResolvedValue([]);
    getAllEntries.mockResolvedValue([]);
    getToday.mockResolvedValue("2026-08-03");

    await expect(
      ProjectDetailPage({ params: Promise.resolve({ id: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
