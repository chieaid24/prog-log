// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjectsPage from "@/app/(log)/projects/page";
import { CommitmentDonut } from "@/components/projects/commitment-donut";
import { buildDonutSegments } from "@/components/projects/prepare";
import { toProjectShares } from "@/lib/rollups";
import type { EntryWithProject, Project } from "@/lib/types";

const getAllProjects = vi.fn();
const getProjectAliases = vi.fn();
const getAllEntries = vi.fn();
const getToday = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));
vi.mock("@/lib/queries", () => ({
  getAllProjects: (...args: unknown[]) => getAllProjects(...args),
  getProjectAliases: (...args: unknown[]) => getProjectAliases(...args),
  getAllEntries: (...args: unknown[]) => getAllEntries(...args),
  getToday: (...args: unknown[]) => getToday(...args),
}));
vi.mock("@/app/actions/projects", () => ({
  createProjectAction: vi.fn(),
  deleteProjectAction: vi.fn(),
  setProjectStatusAction: vi.fn(),
  updateProjectAction: vi.fn(),
  addProjectAliasAction: vi.fn(),
  removeProjectAliasAction: vi.fn(),
}));

function project(name: string, status: "active" | "archived" = "active"): Project {
  return {
    id: name.toLowerCase(),
    user_id: "u1",
    name,
    category: "Learning",
    status,
    color: "#339797",
    started: null,
    description: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

let seq = 0;
function entry(date: string, time: EntryWithProject["time_spent"], p: Project): EntryWithProject {
  seq += 1;
  return {
    id: `e${seq}`,
    user_id: "u1",
    project_id: p.id,
    entry_date: date,
    time_spent: time,
    milestone: null,
    description: null,
    created_at: `${date}T12:00:00Z`,
    project: { id: p.id, name: p.name, color: p.color, category: p.category, status: p.status },
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("commitment donut", () => {
  const segments = buildDonutSegments(
    toProjectShares([
      entry("2026-05-01", "large", project("AI-M")),
      entry("2026-06-01", "large", project("AI-M")),
      entry("2026-07-01", "medium", project("Turkish")),
    ]),
  );

  it("legends every slice with a name and a percent", () => {
    render(<CommitmentDonut segments={segments} activeProjectCount={2} />);
    const list = screen.getByRole("list");
    expect(within(list).getByText("AI-M").textContent).toContain("75%");
    expect(within(list).getByText("Turkish").textContent).toContain("25%");
  });

  it("mirrors the data in a screen-reader table", () => {
    render(<CommitmentDonut segments={segments} activeProjectCount={2} />);
    const table = screen.getByRole("table", {
      name: "All-time Time Commitment share per active Project",
    });
    const row = within(table).getByRole("rowheader", { name: "AI-M" }).closest("tr")!;
    expect(within(row).getByText("6")).toBeInTheDocument();
    expect(within(row).getByText("75%")).toBeInTheDocument();
  });

  it("renders a full-circle single slice for one project", () => {
    const solo = buildDonutSegments(
      toProjectShares([entry("2026-07-01", "small", project("Solo"))]),
    );
    render(<CommitmentDonut segments={solo} activeProjectCount={1} />);
    expect(within(screen.getByRole("list")).getByText("Solo").textContent).toContain("100%");
  });

  it("asks for a first project when none are active", () => {
    render(<CommitmentDonut segments={[]} activeProjectCount={0} />);
    expect(screen.getByText(/No active Projects yet/)).toBeInTheDocument();
  });

  it("asks for a first entry when projects exist but nothing is logged", () => {
    render(<CommitmentDonut segments={[]} activeProjectCount={3} />);
    expect(screen.getByText("No Entries logged yet.")).toBeInTheDocument();
  });
});

describe("projects page", () => {
  it("renders the overview above the retained management list", async () => {
    const aim = project("AI-M");
    const old = project("Retired", "archived");
    getAllProjects.mockResolvedValue([aim, old]);
    getProjectAliases.mockResolvedValue([]);
    getToday.mockResolvedValue("2026-08-03");
    getAllEntries.mockResolvedValue([
      entry("2026-05-01", "large", aim),
      entry("2026-07-15", "small", old),
    ]);

    render(await ProjectsPage());

    const overview = screen.getByRole("region", { name: "Overview" });
    expect(
      within(overview).getByRole("heading", { name: "Time Commitment share" }),
    ).toBeInTheDocument();
    // Archived projects stay out of the all-time donut...
    const legend = within(overview).getByRole("list");
    expect(within(legend).getByText("AI-M").textContent).toContain("100%");
    expect(within(legend).queryByText("Retired")).not.toBeInTheDocument();
    // ...but the management list below keeps them, with usage intact.
    const active = screen.getByRole("region", { name: "Active projects" });
    const archived = screen.getByRole("region", { name: "Archived projects" });
    expect(within(active).getByText("AI-M")).toBeInTheDocument();
    expect(within(active).getByText(/1 entry/)).toBeInTheDocument();
    expect(within(archived).getByText("Retired")).toBeInTheDocument();
  });
});
