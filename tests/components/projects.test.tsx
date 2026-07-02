// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectManager } from "@/components/projects/project-manager";
import type { Project } from "@/lib/types";

const createProjectAction = vi.fn();
const setProjectStatusAction = vi.fn();
const updateProjectAction = vi.fn();

vi.mock("@/app/actions/projects", () => ({
  createProjectAction: (...args: unknown[]) => createProjectAction(...args),
  setProjectStatusAction: (...args: unknown[]) => setProjectStatusAction(...args),
  updateProjectAction: (...args: unknown[]) => updateProjectAction(...args),
}));

function project(name: string, status: "active" | "archived" = "active"): Project {
  return {
    id: name.toLowerCase(),
    user_id: "u1",
    name,
    category: "Learning",
    status,
    color: "#fbbf24",
    started: null,
    description: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

const USAGE = {
  turkish: { entries: 12, lastLoggedDaysAgo: 2 },
  mandarin: { entries: 0, lastLoggedDaysAgo: null },
};

beforeEach(() => {
  createProjectAction.mockReset();
  setProjectStatusAction.mockReset();
  updateProjectAction.mockReset();
});

describe("project manager", () => {
  it("separates active and archived sections and shows usage", () => {
    render(
      <ProjectManager
        projects={[project("Turkish"), project("Mandarin", "archived")]}
        usage={USAGE}
      />,
    );
    const active = screen.getByRole("region", { name: "Active projects" });
    const archived = screen.getByRole("region", { name: "Archived projects" });
    expect(within(active).getByText("Turkish")).toBeInTheDocument();
    expect(within(archived).getByText("Mandarin")).toBeInTheDocument();
    expect(within(active).getByText(/12 entries · last logged 2 days ago/)).toBeInTheDocument();
    expect(within(archived).getByText("never logged")).toBeInTheDocument();
  });

  it("shows an empty state when nothing is archived yet", () => {
    render(<ProjectManager projects={[project("Turkish")]} usage={USAGE} />);
    const archived = screen.getByRole("region", { name: "Archived projects" });
    expect(within(archived).getByText(/Nothing archived yet/)).toBeInTheDocument();
    expect(within(archived).queryByText("Turkish")).not.toBeInTheDocument();
  });

  it("archives an active project via the action", async () => {
    setProjectStatusAction.mockResolvedValue({ ok: true, project: project("Turkish", "archived") });
    const user = userEvent.setup();
    render(<ProjectManager projects={[project("Turkish")]} usage={USAGE} />);

    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(setProjectStatusAction).toHaveBeenCalledWith("turkish", "archived");
  });

  it("restores an archived project", async () => {
    setProjectStatusAction.mockResolvedValue({ ok: true, project: project("Mandarin") });
    const user = userEvent.setup();
    render(<ProjectManager projects={[project("Mandarin", "archived")]} usage={USAGE} />);

    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(setProjectStatusAction).toHaveBeenCalledWith("mandarin", "active");
  });

  it("edits name, category and color through the edit form", async () => {
    updateProjectAction.mockResolvedValue({ ok: true, project: project("Turkce") });
    const user = userEvent.setup();
    render(<ProjectManager projects={[project("Turkish")]} usage={USAGE} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const form = screen.getByRole("form", { name: "Edit Turkish" });
    const nameInput = within(form).getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Turkce");
    await user.click(within(form).getByRole("radio", { name: "Color #f472b6" }));
    await user.click(within(form).getByRole("button", { name: "Save" }));

    expect(updateProjectAction).toHaveBeenCalledWith("turkish", {
      name: "Turkce",
      category: "Learning",
      color: "#f472b6",
    });
  });

  it("creates a project from the top form (auto color by default)", async () => {
    createProjectAction.mockResolvedValue({ ok: true, project: project("Rocketry") });
    const user = userEvent.setup();
    render(<ProjectManager projects={[]} usage={{}} />);

    await user.type(screen.getByLabelText("New project"), "Rocketry");
    await user.selectOptions(screen.getByLabelText("Category"), "Learning");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(createProjectAction).toHaveBeenCalledWith({ name: "Rocketry", category: "Learning" });
  });

  it("passes a palette color when one is picked at create", async () => {
    createProjectAction.mockResolvedValue({ ok: true, project: project("Rocketry") });
    const user = userEvent.setup();
    render(<ProjectManager projects={[]} usage={{}} />);

    const form = screen.getByRole("form", { name: "Create project" });
    await user.type(within(form).getByLabelText("New project"), "Rocketry");
    await user.click(within(form).getByRole("radio", { name: "Color #67e8f9" }));
    await user.click(within(form).getByRole("button", { name: "Create" }));

    expect(createProjectAction).toHaveBeenCalledWith({ name: "Rocketry", color: "#67e8f9" });
  });
});
