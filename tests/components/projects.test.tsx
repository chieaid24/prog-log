// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectManager } from "@/components/projects/project-manager";
import type { Project, ProjectAlias } from "@/lib/types";

const createProjectAction = vi.fn();
const deleteProjectAction = vi.fn();
const setProjectStatusAction = vi.fn();
const updateProjectAction = vi.fn();
const addProjectAliasAction = vi.fn();
const removeProjectAliasAction = vi.fn();

vi.mock("@/app/actions/projects", () => ({
  createProjectAction: (...args: unknown[]) => createProjectAction(...args),
  deleteProjectAction: (...args: unknown[]) => deleteProjectAction(...args),
  setProjectStatusAction: (...args: unknown[]) => setProjectStatusAction(...args),
  updateProjectAction: (...args: unknown[]) => updateProjectAction(...args),
  addProjectAliasAction: (...args: unknown[]) => addProjectAliasAction(...args),
  removeProjectAliasAction: (...args: unknown[]) => removeProjectAliasAction(...args),
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

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});

function aliasRow(text: string, projectId: string): ProjectAlias {
  return {
    id: `al-${text}`,
    user_id: "u1",
    project_id: projectId,
    alias: text,
    created_at: "2026-01-01T00:00:00Z",
  };
}

beforeEach(() => {
  createProjectAction.mockReset();
  deleteProjectAction.mockReset();
  setProjectStatusAction.mockReset();
  updateProjectAction.mockReset();
  addProjectAliasAction.mockReset();
  removeProjectAliasAction.mockReset();
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
    // Mono-for-Measurement: the counted number is mono, the words around it sans.
    const count = within(active).getByText("12");
    expect(count).toHaveClass("font-mono");
    expect(count.parentElement).not.toHaveClass("font-mono");
    expect(count.parentElement).toHaveTextContent("12 entries · last logged 2 days ago");
    expect(within(archived).getByText("never logged")).toBeInTheDocument();
    expect(within(active).getByRole("link", { name: /Turkish/ })).toHaveAttribute(
      "href",
      "/projects/turkish",
    );
    expect(within(archived).getByRole("link", { name: /Mandarin/ })).toHaveAttribute(
      "href",
      "/projects/mandarin",
    );
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

  it("offers delete only for archived projects", () => {
    render(
      <ProjectManager
        projects={[project("Turkish"), project("Mandarin", "archived")]}
        usage={USAGE}
      />,
    );

    const active = screen.getByRole("region", { name: "Active projects" });
    const archived = screen.getByRole("region", { name: "Archived projects" });
    expect(within(active).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(within(active).getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(within(active).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(within(archived).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(within(archived).getByRole("button", { name: "Restore" })).toBeInTheDocument();
    expect(within(archived).getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("names the archived project and exact entry count before delete", async () => {
    const user = userEvent.setup();
    render(<ProjectManager projects={[project("Mandarin", "archived")]} usage={USAGE} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Mandarin" });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveTextContent(
      "Delete 'Mandarin'? This permanently removes 0 entries. Cannot be undone.",
    );

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(dialog).not.toHaveAttribute("open");
    expect(deleteProjectAction).not.toHaveBeenCalled();
  });

  it("deletes the archived project only after confirmation", async () => {
    deleteProjectAction.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<ProjectManager projects={[project("Mandarin", "archived")]} usage={USAGE} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Mandarin" });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(deleteProjectAction).toHaveBeenCalledWith("mandarin");
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
  });

  it("keeps the confirmation open and surfaces a delete failure", async () => {
    deleteProjectAction.mockResolvedValue({ ok: false, error: "Project must be archived." });
    const user = userEvent.setup();
    render(<ProjectManager projects={[project("Mandarin", "archived")]} usage={USAGE} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Mandarin" });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Project must be archived.",
    );
    expect(dialog).toHaveAttribute("open");
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
    await user.click(within(form).getByRole("radio", { name: "Color #bf5b76" }));
    await user.click(within(form).getByRole("button", { name: "Save" }));

    expect(updateProjectAction).toHaveBeenCalledWith("turkish", {
      name: "Turkce",
      category: "Learning",
      color: "#bf5b76",
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
    await user.click(within(form).getByRole("radio", { name: "Color #339797" }));
    await user.click(within(form).getByRole("button", { name: "Create" }));

    expect(createProjectAction).toHaveBeenCalledWith({ name: "Rocketry", color: "#339797" });
  });
});

describe("alias editor (ADR-0010)", () => {
  it("renders alias chips for a project and adds a new one via the action", async () => {
    addProjectAliasAction.mockResolvedValue({ ok: true, alias: aliasRow("mh", "turkish") });
    const user = userEvent.setup();
    render(
      <ProjectManager
        projects={[project("Turkish")]}
        usage={USAGE}
        aliases={{ turkish: [aliasRow("tr", "turkish")] }}
      />,
    );

    expect(screen.getByText("tr")).toBeInTheDocument();

    await user.type(screen.getByLabelText("New alias for Turkish"), "mh");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(addProjectAliasAction).toHaveBeenCalledWith("turkish", "mh");
  });

  it("removes an alias via the action", async () => {
    removeProjectAliasAction.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(
      <ProjectManager
        projects={[project("Turkish")]}
        usage={USAGE}
        aliases={{ turkish: [aliasRow("tr", "turkish")] }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove alias tr" }));
    expect(removeProjectAliasAction).toHaveBeenCalledWith("al-tr");
  });

  it("surfaces a duplicate-alias error", async () => {
    addProjectAliasAction.mockResolvedValue({
      ok: false,
      error: '"tr" is already an alias for one of your projects',
    });
    const user = userEvent.setup();
    render(<ProjectManager projects={[project("Turkish")]} usage={USAGE} aliases={{}} />);

    await user.type(screen.getByLabelText("New alias for Turkish"), "tr");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(
      await screen.findByText('"tr" is already an alias for one of your projects'),
    ).toBeInTheDocument();
  });

  it("hides the alias editor on archived projects", () => {
    render(
      <ProjectManager
        projects={[project("Mandarin", "archived")]}
        usage={USAGE}
        aliases={{ mandarin: [aliasRow("zh", "mandarin")] }}
      />,
    );
    expect(screen.queryByLabelText("New alias for Mandarin")).not.toBeInTheDocument();
  });
});
