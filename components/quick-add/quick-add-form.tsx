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
        <p className="text-xs text-muted">
          Logging for <span className="text-foreground">{humanDate(date)}</span>
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="qa-project" className="text-xs font-medium text-muted">
          Project
        </label>
        <select
          id="qa-project"
          value={creating ? NEW_PROJECT : projectId}
          onChange={(e) => selectProject(e.target.value)}
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-foreground"
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
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-panel p-3">
          <label htmlFor="qa-new-name" className="text-xs font-medium text-muted">
            New project name
          </label>
          <input
            id="qa-new-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Rocketry"
            autoFocus
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm placeholder:text-faint"
          />
          <label htmlFor="qa-new-category" className="text-xs font-medium text-muted">
            Category (optional)
          </label>
          <select
            id="qa-new-category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm"
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
            className="mt-1 rounded-lg bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-background disabled:opacity-50"
          >
            Create &amp; select
          </button>
        </div>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-medium text-muted">Time commitment</legend>
        <div role="group" className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-panel p-1">
          {TIME_SIZES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTimeSpent(t)}
              aria-pressed={timeSpent === t}
              aria-label={TIME_LABEL[t]}
              title={TIME_LABEL[t]}
              className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                timeSpent === t
                  ? "bg-accent text-background"
                  : "text-muted hover:bg-panel-raised hover:text-foreground"
              }`}
            >
              {TIME_LABEL[t][0]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="qa-milestone" className="text-xs font-medium text-muted">
          Milestone <span className="font-normal text-faint">(optional)</span>
        </label>
        <input
          id="qa-milestone"
          value={milestone}
          onChange={(e) => setMilestone(e.target.value)}
          placeholder="Something notable today?"
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm placeholder:text-faint"
        />
      </div>

      {showDetail ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="qa-description" className="text-xs font-medium text-muted">
            Description
          </label>
          <textarea
            id="qa-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What actually happened (rarely needed)"
            className="resize-y rounded-lg border border-line bg-panel px-3 py-2 text-sm placeholder:text-faint"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="self-start text-xs text-faint transition-colors hover:text-muted"
        >
          + add detail
        </button>
      )}

      <button
        type="submit"
        disabled={pending || !projectId || !timeSpent}
        className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {pending ? "Logging…" : "Log it"}
      </button>

      <div aria-live="polite" className="min-h-5 text-sm">
        {error && <p className="text-danger">{error}</p>}
        {logged && !error && <p className="text-success">Logged.</p>}
      </div>
    </form>
  );
}
