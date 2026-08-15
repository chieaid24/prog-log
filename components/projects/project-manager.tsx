"use client";

// Project management (PRD 3.5): create, edit, archive, restore, or delete.
// Permanent deletion is available only after archive.
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  addProjectAliasAction,
  createProjectAction,
  deleteProjectAction,
  removeProjectAliasAction,
  setProjectStatusAction,
  updateProjectAction,
} from "@/app/actions/projects";
import { DEMO_WRITE_NOTE } from "@/lib/demo/mode";
import { humanizeAge } from "@/lib/throwbacks";
import { PROJECT_PALETTE } from "@/lib/palette";
import type { Project, ProjectAlias } from "@/lib/types";

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
  /** Capture aliases (ADR-0010), keyed by project id. */
  aliases?: Record<string, ProjectAlias[]>;
};

export function ProjectManager({ projects, usage, aliases = {} }: Props) {
  const active = projects.filter((p) => p.status === "active");
  const archived = projects.filter((p) => p.status === "archived");

  return (
    <div className="flex flex-col gap-8">
      <CreateProjectForm />

      <section aria-label="Active projects" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink-muted">
          Active <span className="font-mono text-ink-muted">({active.length})</span>
        </h2>
        {active.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-muted">
            No active projects. Create one above to start logging.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((p) => (
              <ProjectRow key={p.id} project={p} usage={usage[p.id]} aliases={aliases[p.id]} />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Archived projects" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink-muted">
          Archived <span className="font-mono text-ink-muted">({archived.length})</span>
        </h2>
        {archived.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-ink-muted">
            Nothing archived yet. Archiving hides a Project from the pickers while its Entries
            stay in history.
          </p>
        ) : (
          <>
            <p className="text-xs text-ink-muted">
              Archived Projects keep their history unless you permanently delete them.
            </p>
            <ul className="flex flex-col gap-2">
              {archived.map((p) => (
                <ProjectRow key={p.id} project={p} usage={usage[p.id]} aliases={aliases[p.id]} />
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
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {allowAuto && (
        <button
          type="button"
          role="radio"
          aria-checked={color === ""}
          aria-label="Auto color"
          title="Auto: picks the least-used palette color"
          onClick={() => onChange("")}
          className={`grid h-6 w-6 place-items-center rounded-full border border-border-strong text-[9px] font-semibold text-ink-muted transition-transform hover:scale-110 pointer-coarse:h-11 pointer-coarse:w-11 pointer-coarse:text-xs ${
            color === "" ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""
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
          className={`h-6 w-6 rounded-full transition-transform hover:scale-110 pointer-coarse:h-11 pointer-coarse:w-11 ${
            color === c ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""
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
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex min-w-40 flex-1 flex-col gap-1.5">
        <label htmlFor="np-name" className="text-xs font-medium text-ink-muted">
          New project
        </label>
        <input
          id="np-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          autoComplete="off"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-ink-faint focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="np-category" className="text-xs font-medium text-ink-muted">
          Category
        </label>
        <select
          id="np-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base"
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
        <span className="text-xs font-medium text-ink-muted">Color</span>
        <PalettePicker label="New project color" color={color} onChange={setColor} allowAuto />
      </div>
      <button
        type="submit"
        disabled={pending || name.trim().length === 0}
        className="rounded-lg bg-frog-green px-4 py-2 text-sm font-semibold text-on-green transition-colors enabled:hover:bg-frog-green-strong disabled:bg-surface-sunken disabled:text-ink-faint pointer-coarse:py-3"
      >
        {pending ? "Creating…" : "Create"}
      </button>
      {error && (
        <p
          role="alert"
          className={`w-full text-sm ${error === DEMO_WRITE_NOTE ? "text-ink-muted" : "text-danger-red"}`}
        >
          {error}
        </p>
      )}
    </form>
  );
}

function ProjectRow({
  project,
  usage,
  aliases,
}: {
  project: Project;
  usage?: ProjectUsage;
  aliases?: ProjectAlias[];
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const archived = project.status === "archived";
  const entryCount = usage?.entries ?? 0;

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

  function deletePermanently() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteProjectAction(project.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      deleteDialogRef.current?.close();
    });
  }

  return (
    <li
      className={`rounded-xl border bg-surface p-4 transition-colors ${
        archived ? "border-dashed border-border-strong" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/projects/${project.id}`}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-3 rounded-lg transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frog-green pointer-coarse:min-h-11"
        >
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: project.color ?? "var(--ink-faint)" }}
          />
          <span className="font-medium">{project.name}</span>
          {project.category && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-ink-muted">
              {project.category}
            </span>
          )}
          <span className="text-xs text-ink-muted">
            {usage && usage.entries > 0 ? (
              <>
                <span className="font-mono">{usage.entries}</span>{" "}
                {usage.entries === 1 ? "entry" : "entries"} · last logged{" "}
                {humanizeAge(usage.lastLoggedDaysAgo ?? 0)}
              </>
            ) : (
              "never logged"
            )}
          </span>
        </Link>
        <span className="ml-auto flex gap-2">
          {!archived && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:min-h-11 pointer-coarse:px-4 pointer-coarse:py-3"
            >
              {editing ? "Close" : "Edit"}
            </button>
          )}
          <button
            type="button"
            onClick={toggleStatus}
            disabled={pending}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-border-strong hover:text-ink disabled:opacity-50 pointer-coarse:min-h-11 pointer-coarse:px-4 pointer-coarse:py-3"
          >
            {archived ? "Restore" : "Archive"}
          </button>
          {archived && (
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                deleteDialogRef.current?.showModal();
              }}
              disabled={pending}
              className="rounded-lg border border-danger-red px-3 py-1.5 text-xs text-danger-red transition-colors hover:bg-danger-red hover:text-on-green disabled:opacity-50 pointer-coarse:min-h-11 pointer-coarse:px-4 pointer-coarse:py-3"
            >
              Delete
            </button>
          )}
        </span>
      </div>
      {error && (
        <p
          role="alert"
          className={`mt-2 text-sm ${error === DEMO_WRITE_NOTE ? "text-ink-muted" : "text-danger-red"}`}
        >
          {error}
        </p>
      )}
      {archived && (
        <dialog
          ref={deleteDialogRef}
          aria-label={`Delete ${project.name}`}
          className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-xl border border-border bg-surface p-5 text-ink shadow-overlay backdrop:bg-ink/35"
        >
          <p className="text-sm leading-relaxed">
            Delete &apos;{project.name}&apos;? This permanently removes{" "}
            <span className="font-mono">{entryCount}</span>{" "}
            {entryCount === 1 ? "entry" : "entries"}. Cannot be undone.
          </p>
          {deleteError && (
            <p
              role="alert"
              className={`mt-3 text-sm ${
                deleteError === DEMO_WRITE_NOTE ? "text-ink-muted" : "text-danger-red"
              }`}
            >
              {deleteError}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                deleteDialogRef.current?.close();
              }}
              disabled={pending}
              className="rounded-lg border border-border px-4 py-2 text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink disabled:opacity-50 pointer-coarse:py-3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={deletePermanently}
              disabled={pending}
              className="rounded-lg bg-danger-red px-4 py-2 text-sm font-semibold text-on-green disabled:opacity-50 pointer-coarse:py-3"
            >
              {pending ? "Deleting..." : "Delete"}
            </button>
          </div>
        </dialog>
      )}
      {!archived && editing && (
        <EditProjectForm project={project} onSaved={() => setEditing(false)} />
      )}
      {!archived && <AliasEditor project={project} aliases={aliases ?? []} />}
    </li>
  );
}

/**
 * Capture aliases (ADR-0010): extra names Discord and the Shortcut accept for
 * this Project. Chips with remove, plus a small inline add form.
 */
function AliasEditor({ project, aliases }: { project: Project; aliases: ProjectAlias[] }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addProjectAliasAction(project.id, draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft("");
    });
  }

  function remove(aliasId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeProjectAliasAction(aliasId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <span className="text-xs text-ink-muted" title="Extra names Discord and the Shortcut accept">
        Aliases
      </span>
      {aliases.map((a) => (
        <span
          key={a.id}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-ink-muted"
        >
          {a.alias}
          <button
            type="button"
            aria-label={`Remove alias ${a.alias}`}
            onClick={() => remove(a.id)}
            disabled={pending}
            className="tap rounded-full px-1 text-ink-muted transition-colors hover:text-danger-red disabled:opacity-50"
          >
            &times;
          </button>
        </span>
      ))}
      <form onSubmit={add} aria-label={`Add alias for ${project.name}`} className="flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          placeholder="add alias"
          aria-label={`New alias for ${project.name}`}
          autoComplete="off"
          enterKeyHint="done"
          className="w-28 rounded-full border border-dashed border-border bg-surface px-2.5 py-0.5 text-xs placeholder:text-ink-faint focus:border-frog-green pointer-coarse:w-40 pointer-coarse:py-2 pointer-coarse:text-base"
        />
        <button
          type="submit"
          disabled={pending || draft.trim().length === 0}
          className="rounded-full border border-border px-2.5 py-0.5 text-xs text-ink-muted transition-colors hover:border-border-strong hover:text-ink disabled:opacity-50 pointer-coarse:min-h-11 pointer-coarse:px-4 pointer-coarse:py-3"
        >
          Add
        </button>
      </form>
      {error && (
        <p
          role="alert"
          className={`w-full text-xs ${error === DEMO_WRITE_NOTE ? "text-ink-muted" : "text-danger-red"}`}
        >
          {error}
        </p>
      )}
    </div>
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
      className="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3"
    >
      <div className="flex min-w-40 flex-1 flex-col gap-1.5">
        <label htmlFor={`edit-name-${project.id}`} className="text-xs font-medium text-ink-muted">
          Name
        </label>
        <input
          id={`edit-name-${project.id}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`edit-cat-${project.id}`} className="text-xs font-medium text-ink-muted">
          Category
        </label>
        <select
          id={`edit-cat-${project.id}`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base"
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
        <span className="text-xs font-medium text-ink-muted">Color</span>
        <PalettePicker label="Project color" color={color} onChange={setColor} />
      </div>
      <button
        type="submit"
        disabled={pending || name.trim().length === 0}
        className="rounded-lg bg-frog-green px-4 py-2 text-sm font-semibold text-on-green transition-colors enabled:hover:bg-frog-green-strong disabled:bg-surface-sunken disabled:text-ink-faint pointer-coarse:py-3"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {error && (
        <p
          role="alert"
          className={`w-full text-sm ${error === DEMO_WRITE_NOTE ? "text-ink-muted" : "text-danger-red"}`}
        >
          {error}
        </p>
      )}
    </form>
  );
}
