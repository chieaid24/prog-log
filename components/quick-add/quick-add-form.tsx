"use client";

// Quick add (PRD 3.2): the common case is two picks. Project and Time
// Commitment are the always-visible controls; Milestone is one optional line;
// Description hides behind "+ add detail". "+ New project" creates inline
// without leaving the flow.
import { useRef, useState, useTransition } from "react";
import { logEntryAction } from "@/app/actions/entries";
import { createProjectAction } from "@/app/actions/projects";
import { humanDate } from "@/lib/dates";
import { TIME_LABEL, TIME_SIZES, type Project, type TimeSize } from "@/lib/types";

const NEW_PROJECT = "__new__";
const CATEGORIES = ["Work", "Research", "Personal", "Learning"];

type Props = {
  projects: Project[];
  /** ISO date to log against (clicked calendar day); omitted = today. */
  date?: string;
  /** Called after a successful log (e.g. to close a day popover). */
  onLogged?: () => void;
};

export function QuickAddForm({ projects: initialProjects, date, onLogged }: Props) {
  const [projects, setProjects] = useState(initialProjects);
  const [projectId, setProjectId] = useState("");
  const [timeSpent, setTimeSpent] = useState<TimeSize | null>(null);
  const [milestone, setMilestone] = useState("");
  const [description, setDescription] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);
  const [pending, startTransition] = useTransition();
  const loggedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function selectProject(value: string) {
    setError(null);
    if (value === NEW_PROJECT) {
      setCreating(true);
      setProjectId("");
    } else {
      setCreating(false);
      setProjectId(value);
    }
  }

  function createInline() {
    startTransition(async () => {
      const result = await createProjectAction({
        name: newName,
        category: newCategory || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setProjects((prev) =>
        prev.some((p) => p.id === result.project.id)
          ? prev
          : [...prev, result.project].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setProjectId(result.project.id);
      setCreating(false);
      setNewName("");
      setNewCategory("");
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!projectId || !timeSpent) return;
    setError(null);
    startTransition(async () => {
      const result = await logEntryAction({
        projectId,
        timeSpent,
        milestone: milestone || undefined,
        description: description || undefined,
        entryDate: date,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMilestone("");
      setDescription("");
      setShowDetail(false);
      setLogged(true);
      if (loggedTimer.current) clearTimeout(loggedTimer.current);
      loggedTimer.current = setTimeout(() => setLogged(false), 2500);
      onLogged?.();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" aria-label="Quick add">
      {date && (
        <p className="text-xs text-ink-muted">
          Logging for <span className="font-mono text-ink">{humanDate(date)}</span>
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="qa-project" className="text-xs font-medium text-ink-muted">
          Project
        </label>
        <select
          id="qa-project"
          value={creating ? NEW_PROJECT : projectId}
          onChange={(e) => selectProject(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base"
        >
          <option value="" disabled>
            Select project…
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value={NEW_PROJECT}>+ New project</option>
        </select>
      </div>

      {creating && (
        <div className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-3">
          <label htmlFor="qa-new-name" className="text-xs font-medium text-ink-muted">
            New project name
          </label>
          <input
            id="qa-new-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Rocketry"
            autoFocus
            autoComplete="off"
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-ink-faint focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base"
          />
          <label htmlFor="qa-new-category" className="text-xs font-medium text-ink-muted">
            Category (optional)
          </label>
          <select
            id="qa-new-category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base"
          >
            <option value="">No category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={createInline}
            disabled={pending || newName.trim().length === 0}
            className="mt-1 rounded-lg bg-frog-green-soft px-3 py-1.5 text-sm font-medium text-frog-green-strong transition-colors hover:bg-frog-green hover:text-on-green disabled:opacity-50 pointer-coarse:py-3"
          >
            Create &amp; select
          </button>
        </div>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-medium text-ink-muted">Time commitment</legend>
        <div role="group" className="grid grid-cols-3 gap-1 rounded-lg bg-surface-sunken p-1">
          {TIME_SIZES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTimeSpent(t)}
              aria-pressed={timeSpent === t}
              aria-label={TIME_LABEL[t]}
              title={TIME_LABEL[t]}
              className={`rounded-md px-2 py-1.5 font-mono text-sm font-medium transition-colors pointer-coarse:py-3 ${
                timeSpent === t
                  ? "bg-frog-green font-semibold text-on-green"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {TIME_LABEL[t][0]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="qa-milestone" className="text-xs font-medium text-ink-muted">
          Milestone <span className="font-normal text-ink-faint">(optional)</span>
        </label>
        <input
          id="qa-milestone"
          value={milestone}
          onChange={(e) => setMilestone(e.target.value)}
          placeholder="Something notable today?"
          enterKeyHint="done"
          autoComplete="off"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-ink-faint focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base"
        />
      </div>

      {showDetail ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="qa-description" className="text-xs font-medium text-ink-muted">
            Description
          </label>
          <textarea
            id="qa-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What actually happened (rarely needed)"
            className="resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-ink-faint focus:border-frog-green pointer-coarse:text-base"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="tap self-start rounded-md text-xs text-ink-faint transition-colors hover:text-ink-muted"
        >
          + add detail
        </button>
      )}

      <button
        type="submit"
        disabled={pending || !projectId || !timeSpent}
        className="rounded-lg bg-frog-green px-3 py-2 text-sm font-semibold text-on-green transition-colors hover:bg-frog-green-strong disabled:opacity-40 pointer-coarse:py-3"
      >
        {pending ? "Logging…" : "Log it"}
      </button>

      <div aria-live="polite" className="min-h-5 text-sm">
        {error && <p className="text-danger-red">{error}</p>}
        {logged && !error && <p className="font-medium text-frog-green-strong">Logged.</p>}
      </div>
    </form>
  );
}
