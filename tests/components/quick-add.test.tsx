// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuickAddForm } from "@/components/quick-add/quick-add-form";
import { DEMO_WRITE_NOTE } from "@/lib/demo/mode";
import type { Project } from "@/lib/types";

const logEntryAction = vi.fn();
const createProjectAction = vi.fn();
const setReflectionAction = vi.fn();

vi.mock("@/app/actions/entries", () => ({
  logEntryAction: (...args: unknown[]) => logEntryAction(...args),
}));
vi.mock("@/app/actions/projects", () => ({
  createProjectAction: (...args: unknown[]) => createProjectAction(...args),
}));
vi.mock("@/app/actions/reflections", () => ({
  setReflectionAction: (...args: unknown[]) => setReflectionAction(...args),
}));

function project(name: string, id = name.toLowerCase()): Project {
  return {
    id,
    user_id: "u1",
    name,
    category: null,
    status: "active",
    color: "#7c8cf8",
    started: null,
    description: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

const PROJECTS = [project("AI-M"), project("Work")];

beforeEach(() => {
  logEntryAction.mockReset();
  createProjectAction.mockReset();
  setReflectionAction.mockReset();
});

describe("quick add", () => {
  it("logs the common case: pick project, pick time, done", async () => {
    logEntryAction.mockResolvedValue({ ok: true, entry: {} });
    const user = userEvent.setup();
    render(<QuickAddForm projects={PROJECTS} />);

    await user.selectOptions(screen.getByLabelText("Project"), "work");
    await user.click(screen.getByRole("button", { name: "Medium" }));
    await user.click(screen.getByRole("button", { name: "Log it" }));

    expect(logEntryAction).toHaveBeenCalledWith({
      projectId: "work",
      timeSpent: "medium",
      milestone: undefined,
      description: undefined,
      entryDate: undefined,
    });
    expect(await screen.findByText("Logged.")).toBeInTheDocument();
  });

  it("passes the clicked calendar date through", async () => {
    logEntryAction.mockResolvedValue({ ok: true, entry: {} });
    const user = userEvent.setup();
    render(<QuickAddForm projects={PROJECTS} date="2026-06-14" />);

    expect(screen.getByText(/Logging for/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Project"), "ai-m");
    await user.click(screen.getByRole("button", { name: "Large" }));
    await user.click(screen.getByRole("button", { name: "Log it" }));

    expect(logEntryAction).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "ai-m", timeSpent: "large", entryDate: "2026-06-14" }),
    );
  });

  it("sends milestone text and keeps description hidden until revealed", async () => {
    logEntryAction.mockResolvedValue({ ok: true, entry: {} });
    const user = userEvent.setup();
    render(<QuickAddForm projects={PROJECTS} />);

    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+ add detail" }));
    expect(screen.getByLabelText("Description")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Project"), "work");
    await user.click(screen.getByRole("button", { name: "Small" }));
    await user.type(screen.getByLabelText(/Milestone/), "shipped the heatmap");
    await user.type(screen.getByLabelText("Description"), "all the cells render");
    await user.click(screen.getByRole("button", { name: "Log it" }));

    expect(logEntryAction).toHaveBeenCalledWith(
      expect.objectContaining({
        milestone: "shipped the heatmap",
        description: "all the cells render",
      }),
    );
  });

  it("creates a project inline, selects it, and continues the entry", async () => {
    createProjectAction.mockResolvedValue({ ok: true, project: project("Rocketry") });
    logEntryAction.mockResolvedValue({ ok: true, entry: {} });
    const user = userEvent.setup();
    render(<QuickAddForm projects={PROJECTS} />);

    await user.selectOptions(screen.getByLabelText("Project"), "+ New project");
    await user.type(screen.getByLabelText("New project name"), "Rocketry");
    await user.selectOptions(screen.getByLabelText(/Category/), "Learning");
    await user.click(screen.getByRole("button", { name: "Create & select" }));

    expect(createProjectAction).toHaveBeenCalledWith({ name: "Rocketry", category: "Learning" });
    // The new project is now the selected option.
    expect(
      (screen.getByLabelText("Project") as HTMLSelectElement).value,
    ).toBe("rocketry");

    await user.click(screen.getByRole("button", { name: "Large" }));
    await user.click(screen.getByRole("button", { name: "Log it" }));
    expect(logEntryAction).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "rocketry", timeSpent: "large" }),
    );
  });

  it("disables submit until both required picks are made", async () => {
    const user = userEvent.setup();
    render(<QuickAddForm projects={PROJECTS} />);

    const submit = screen.getByRole("button", { name: "Log it" });
    expect(submit).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Project"), "work");
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Small" }));
    expect(submit).toBeEnabled();
  });

  it("surfaces server errors", async () => {
    logEntryAction.mockResolvedValue({ ok: false, error: "Could not log the entry." });
    const user = userEvent.setup();
    render(<QuickAddForm projects={PROJECTS} />);

    await user.selectOptions(screen.getByLabelText("Project"), "work");
    await user.click(screen.getByRole("button", { name: "Small" }));
    await user.click(screen.getByRole("button", { name: "Log it" }));

    expect(await screen.findByText("Could not log the entry.")).toBeInTheDocument();
  });

  it("shows an inviting empty reflection field when the day has none", () => {
    render(<QuickAddForm projects={PROJECTS} />);

    const field = screen.getByLabelText(/Day reflection/) as HTMLInputElement;
    expect(field.value).toBe("");
    expect(field).toHaveAttribute("placeholder", "One line about today");
    expect(field).not.toHaveClass("text-ink-muted");
    // No stray save affordance while there is nothing to save.
    expect(screen.queryByRole("button", { name: "Save reflection" })).not.toBeInTheDocument();
  });

  it("shows an existing reflection grayed but still editable", async () => {
    const user = userEvent.setup();
    render(<QuickAddForm projects={PROJECTS} reflection="built the heatmap" />);

    const field = screen.getByLabelText(/Day reflection/) as HTMLInputElement;
    expect(field.value).toBe("built the heatmap");
    expect(field).toHaveClass("text-ink-muted");

    await user.type(field, " end to end");
    expect(field.value).toBe("built the heatmap end to end");
    // Once edited it reads as a draft again, not saved text.
    expect(field).not.toHaveClass("text-ink-muted");
  });

  it("saves a typed reflection through set_reflection when the entry is logged", async () => {
    logEntryAction.mockResolvedValue({ ok: true, entry: {} });
    setReflectionAction.mockResolvedValue({ ok: true, reflection: {} });
    const user = userEvent.setup();
    render(<QuickAddForm projects={PROJECTS} />);

    await user.selectOptions(screen.getByLabelText("Project"), "work");
    await user.click(screen.getByRole("button", { name: "Medium" }));
    await user.type(screen.getByLabelText(/Day reflection/), "proud of the demo");
    await user.click(screen.getByRole("button", { name: "Log it" }));

    expect(logEntryAction).toHaveBeenCalled();
    expect(setReflectionAction).toHaveBeenCalledWith({
      reflection: "proud of the demo",
      entryDate: undefined,
    });
    expect(await screen.findByText("Logged.")).toBeInTheDocument();
  });

  it("never blocks logging: an untouched reflection is not re-saved", async () => {
    logEntryAction.mockResolvedValue({ ok: true, entry: {} });
    const user = userEvent.setup();
    render(<QuickAddForm projects={PROJECTS} reflection="already saved" />);

    await user.selectOptions(screen.getByLabelText("Project"), "work");
    await user.click(screen.getByRole("button", { name: "Small" }));
    await user.click(screen.getByRole("button", { name: "Log it" }));

    expect(logEntryAction).toHaveBeenCalled();
    expect(setReflectionAction).not.toHaveBeenCalled();
    expect(await screen.findByText("Logged.")).toBeInTheDocument();
  });

  it("edits a past day's reflection without logging an entry", async () => {
    setReflectionAction.mockResolvedValue({ ok: true, reflection: {} });
    const user = userEvent.setup();
    render(
      <QuickAddForm projects={PROJECTS} date="2026-06-14" reflection="old line" />,
    );

    const field = screen.getByLabelText(/Day reflection/);
    await user.clear(field);
    await user.type(field, "fixed the streak math");
    await user.click(screen.getByRole("button", { name: "Save reflection" }));

    expect(setReflectionAction).toHaveBeenCalledWith({
      reflection: "fixed the streak math",
      entryDate: "2026-06-14",
    });
    expect(logEntryAction).not.toHaveBeenCalled();
    expect(await screen.findByText("Reflection saved.")).toBeInTheDocument();
    // The saved text is the new baseline: grayed again, save affordance gone.
    expect(field).toHaveClass("text-ink-muted");
    expect(screen.queryByRole("button", { name: "Save reflection" })).not.toBeInTheDocument();
  });

  it("surfaces a reflection save failure without losing the logged entry", async () => {
    logEntryAction.mockResolvedValue({ ok: true, entry: {} });
    setReflectionAction.mockResolvedValue({ ok: false, error: "Could not save the reflection." });
    const user = userEvent.setup();
    render(<QuickAddForm projects={PROJECTS} />);

    await user.selectOptions(screen.getByLabelText("Project"), "work");
    await user.click(screen.getByRole("button", { name: "Small" }));
    await user.type(screen.getByLabelText(/Day reflection/), "half a line");
    await user.click(screen.getByRole("button", { name: "Log it" }));

    expect(logEntryAction).toHaveBeenCalled();
    expect(await screen.findByText("Could not save the reflection.")).toBeInTheDocument();
    expect(screen.queryByText("Logged.")).not.toBeInTheDocument();
  });

  it("in demo mode, shows an unobtrusive note and does not confirm a save", async () => {
    logEntryAction.mockResolvedValue({ ok: false, demo: true, error: DEMO_WRITE_NOTE });
    const user = userEvent.setup();
    render(<QuickAddForm projects={PROJECTS} />);

    await user.selectOptions(screen.getByLabelText("Project"), "work");
    await user.click(screen.getByRole("button", { name: "Medium" }));
    await user.click(screen.getByRole("button", { name: "Log it" }));

    const note = await screen.findByText(DEMO_WRITE_NOTE);
    expect(note).toBeInTheDocument();
    // A no-op is neither a success nor a red error.
    expect(note).toHaveClass("text-ink-muted");
    expect(screen.queryByText("Logged.")).not.toBeInTheDocument();
  });
});
