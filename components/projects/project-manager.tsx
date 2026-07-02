"use client";

// Project management (PRD 3.5): create, edit, archive — never delete.
// Archived Projects leave the pickers but keep every Entry in history views.
import { useState, useTransition } from "react";
import {
  createProjectAction,
  setProjectStatusAction,
  updateProjectAction,
} from "@/app/actions/projects";
import { humanizeAge } from "@/lib/throwbacks";
import { PROJECT_PALETTE } from "@/lib/palette";
import type { Project } from "@/lib/types";

const CATEGORIES = ["Work", "Research", "Personal", "Learning"];

export type ProjectUsage = {
  /** Entry count per project id. */
  entries: number;
  /** Days since last Entry, or null when never logged. */
  lastLoggedDaysAgo: number | null;
};

type Props = {
  projects: Project[];
  usage: Record<string, ProjectUsage>;
};

export function ProjectManager({ projects, usage }: Props) {
  const active = projects.filter((p) => p.status === "active");
  const archived = projects.filter((p) => p.status === "archived");

  return (
    <div className="flex flex-col gap-8">
      <CreateProjectForm />

      <section aria-label="Active projects" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted">
          Active <span className="text-faint">({active.length})</span>
        </h2>
        {active.length === 0 ? (
          <p className="rounded-xl border border-line bg-panel p-6 text-sm text-muted">
            No active projects. Create one above to start logging.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((p) => (
              <ProjectRow key={p.id} project={p} usage={usage[p.id]} />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Archived projects" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted">
          Archived <span className="text-faint">({archived.length})</span>
        </h2>
        {archived.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-panel p-6 text-sm text-muted">
            Nothing archived yet. Archiving hides a project from the pickers while its entries
            stay in the monthly breakdown and Throwbacks.
          </p>
        ) : (
          <>
            <p className="text-xs text-faint">
              Archived projects stay in the monthly breakdown and Throwbacks; they just leave
              the pickers.
            </p>
            <ul className="flex flex-col gap-2">
              {archived.map((p) => (
                <ProjectRow key={p.id} project={p} usage={usage[p.id]} />
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

/** Palette swatch radio group; `allowAuto` prepends an "auto" option ("" value). */
function PalettePicker({
  label,
  color,
  onChange,
  allowAuto = false,
}: {
  label: string;
  color: string;
  onChange: (color: string) => void;
  allowAuto?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1.5">
      {allowAuto && (
        <button
          type="button"
          role="radio"
          aria-checked={color === ""}
          aria-label="Auto color"
          title="Auto — picks the least-used palette color"
          onClick={() => onChange("")}
          className={`grid h-6 w-6 place-items-center rounded-full border border-line-strong text-[9px] font-semibold text-muted transition-transform hover:scale-110 ${
            color === "" ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
          }`}
        >
          A
        </button>
      )}
      {PROJECT_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={color === c}
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
            color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function CreateProjectForm() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState(""); // "" = auto-assign from the palette
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createProjectAction({
        name,
        category: category || undefined,
        ...(color ? { color } : {}),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setCategory("");
      setColor("");
    });
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Create project"
      className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-panel p-4"
    >
      <div className="flex min-w-40 flex-1 flex-col gap-1.5">
        <label htmlFor="np-name" className="text-xs font-medium text-muted">
          New project
        </label>
        <input
          id="np-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm placeholder:text-faint"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="np-category" className="text-xs font-medium text-muted">
          Category
        </label>
        <select
          id="np-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
        >
          <option value="">No category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5 pb-1">
        <span className="text-xs font-medium text-muted">Color</span>
        <PalettePicker label="New project color" color={color} onChange={setColor} allowAuto />
      </div>
      <button
        type="submit"
        disabled={pending || name.trim().length === 0}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {pending ? "Creating…" : "Create"}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

function ProjectRow({ project, usage }: { project: Project; usage?: ProjectUsage }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const archived = project.status === "archived";

  function toggleStatus() {
    setError(null);
    startTransition(async () => {
      const result = await setProjectStatusAction(
        project.id,
        archived ? "active" : "archived",
      );
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li
      className={`rounded-xl border border-line bg-panel p-4 transition-colors ${
        archived ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: project.color ?? "#5c6478" }}
        />
        <span className="font-medium">{project.name}</span>
        {project.category && (
          <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
            {project.category}
          </span>
        )}
        <span className="text-xs text-faint">
          {usage && usage.entries > 0
            ? `${usage.entries} ${usage.entries === 1 ? "entry" : "entries"} · last logged ${humanizeAge(usage.lastLoggedDaysAgo ?? 0)}`
            : "never logged"}
        </span>
        <span className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-foreground"
          >
            {editing ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            onClick={toggleStatus}
            disabled={pending}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-foreground disabled:opacity-50"
          >
            {archived ? "Restore" : "Archive"}
          </button>
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      {editing && (
        <EditProjectForm project={project} onSaved={() => setEditing(false)} />
      )}
    </li>
  );
}

function EditProjectForm({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const [name, setName] = useState(project.name);
  const [category, setCategory] = useState(project.category ?? "");
  const [color, setColor] = useState(project.color ?? PROJECT_PALETTE[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateProjectAction(project.id, {
        name,
        category: category || null,
        color,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <form
      onSubmit={submit}
      aria-label={`Edit ${project.name}`}
      className="mt-3 flex flex-wrap items-end gap-3 border-t border-line pt-3"
    >
      <div className="flex min-w-40 flex-1 flex-col gap-1.5">
        <label htmlFor={`edit-name-${project.id}`} className="text-xs font-medium text-muted">
          Name
        </label>
        <input
          id={`edit-name-${project.id}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`edit-cat-${project.id}`} className="text-xs font-medium text-muted">
          Category
        </label>
        <select
          id={`edit-cat-${project.id}`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm"
        >
          <option value="">No category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5 pb-1">
        <span className="text-xs font-medium text-muted">Color</span>
        <PalettePicker label="Project color" color={color} onChange={setColor} />
      </div>
      <button
        type="submit"
        disabled={pending || name.trim().length === 0}
        className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
