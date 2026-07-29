"use client";

// Quick add (PRD 3.2): the common case is two picks. Project and Time
// Commitment are the always-visible controls; Milestone is one optional line;
// Description hides behind "+ add detail". "+ New project" creates inline
// without leaving the flow. The day's Reflection (ADR-0017) rides along:
// inviting when unset, grayed once set, saved with the entry or on its own,
// never required to log.
import { useId, useRef, useState, useTransition } from "react";
import { logEntryAction } from "@/app/actions/entries";
import { createProjectAction } from "@/app/actions/projects";
import { setReflectionAction } from "@/app/actions/reflections";
import { humanDate } from "@/lib/dates";
import { isDemoNotice } from "@/lib/demo/mode";
import { TIME_LABEL, TIME_SIZES, type Project, type TimeSize } from "@/lib/types";

const NEW_PROJECT = "__new__";
const CATEGORIES = ["Work", "Research", "Personal", "Learning"];

type Props = {
  projects: Project[];
  /** ISO date to log against (clicked calendar day); omitted = today. */
  date?: string;
  /** The day's existing Reflection text; null/omitted = not set yet. */
  reflection?: string | null;
  /** Called after a successful log (e.g. to close a day popover). */
  onLogged?: () => void;
};

export function QuickAddForm({
  projects: initialProjects,
  date,
  reflection: initialReflection,
  onLogged,
}: Props) {
  // The form renders more than once per page (desktop aside + day detail +
  // the mobile sheet), so field ids must be instance-unique or labels bind
  // to the wrong (even hidden) controls.
  const uid = useId();
  const [projects, setProjects] = useState(initialProjects);
  const [projectId, setProjectId] = useState("");
  const [timeSpent, setTimeSpent] = useState<TimeSize | null>(null);
  const [milestone, setMilestone] = useState("");
  const [description, setDescription] = useState("");
  const [reflection, setReflection] = useState(initialReflection ?? "");
  // Last text known to be persisted; dirty-tracking baseline for saves.
  const [savedReflection, setSavedReflection] = useState(initialReflection ?? "");
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);
  const [pending, startTransition] = useTransition();
  const loggedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reflectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reflectionText = reflection.trim();
  const reflectionDirty =
    reflectionText.length > 0 && reflectionText !== savedReflection.trim();
  // Grayed while it just shows what is already saved; normal ink once touched.
  const reflectionPristine = savedReflection.trim().length > 0 && !reflectionDirty;

  /** Persist the Reflection via set_reflection; true on success. */
  async function persistReflection(text: string): Promise<boolean> {
    const result = await setReflectionAction({ reflection: text, entryDate: date });
    if (!result.ok) {
      if (isDemoNotice(result)) {
        setNotice(result.error);
        return false;
      }
      setError(result.error);
      return false;
    }
    setSavedReflection(text);
    return true;
  }

  /** Reflection-only save (edit any day without logging an entry). */
  function saveReflection() {
    if (!reflectionDirty) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      if (!(await persistReflection(reflectionText))) return;
      setReflectionSaved(true);
      if (reflectionTimer.current) clearTimeout(reflectionTimer.current);
      reflectionTimer.current = setTimeout(() => setReflectionSaved(false), 2500);
    });
  }

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
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await createProjectAction({
        name: newName,
        category: newCategory || undefined,
      });
      if (!result.ok) {
        if (isDemoNotice(result)) {
          setNotice(result.error);
          return;
        }
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
    setNotice(null);
    startTransition(async () => {
      const result = await logEntryAction({
        projectId,
        timeSpent,
        milestone: milestone || undefined,
        description: description || undefined,
        entryDate: date,
      });
      if (!result.ok) {
        if (isDemoNotice(result)) {
          setNotice(result.error);
          return;
        }
        setError(result.error);
        return;
      }
      // The entry is logged either way; a failed reflection save only shows
      // its own error (the reflection never blocks logging).
      if (reflectionDirty && !(await persistReflection(reflectionText))) return;
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
        <label htmlFor={`${uid}-project`} className="text-xs font-medium text-ink-muted">
          Project
        </label>
        <select
          id={`${uid}-project`}
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
          <label htmlFor={`${uid}-new-name`} className="text-xs font-medium text-ink-muted">
            New project name
          </label>
          <input
            id={`${uid}-new-name`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Rocketry"
            autoFocus
            autoComplete="off"
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-ink-faint focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base"
          />
          <label htmlFor={`${uid}-new-category`} className="text-xs font-medium text-ink-muted">
            Category (optional)
          </label>
          <select
            id={`${uid}-new-category`}
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
              className={`rounded-lg px-2 py-1.5 font-mono text-sm font-medium transition-colors pointer-coarse:py-3 ${
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
        <label htmlFor={`${uid}-milestone`} className="text-xs font-medium text-ink-muted">
          Milestone <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id={`${uid}-milestone`}
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
          <label htmlFor={`${uid}-description`} className="text-xs font-medium text-ink-muted">
            Description
          </label>
          <textarea
            id={`${uid}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What actually happened (rarely needed)"
            className="resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-ink-faint focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="tap self-start rounded-md text-xs text-ink-muted transition-colors hover:text-ink-muted"
        >
          + add detail
        </button>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-reflection`} className="text-xs font-medium text-ink-muted">
          Day reflection <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id={`${uid}-reflection`}
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder={date ? "One line about this day" : "One line about today"}
          enterKeyHint="done"
          autoComplete="off"
          className={`rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-ink-faint focus:border-frog-green pointer-coarse:py-3 pointer-coarse:text-base ${
            reflectionPristine ? "text-ink-muted" : "text-ink"
          }`}
        />
        {reflectionDirty && (
          <button
            type="button"
            onClick={saveReflection}
            disabled={pending}
            className="tap self-start rounded-md text-xs text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
          >
            Save reflection
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={pending || !projectId || !timeSpent}
        className="rounded-lg bg-frog-green px-3 py-2 text-sm font-semibold text-on-green transition-colors hover:bg-frog-green-strong disabled:opacity-40 pointer-coarse:py-3"
      >
        {pending ? "Logging…" : "Log it"}
      </button>

      <div aria-live="polite" className="min-h-5 text-sm">
        {error && <p className="text-danger-red">{error}</p>}
        {notice && !error && <p className="text-ink-muted">{notice}</p>}
        {logged && !error && !notice && (
          <p className="font-medium text-frog-green-strong">Logged.</p>
        )}
        {reflectionSaved && !logged && !error && !notice && (
          <p className="font-medium text-frog-green-strong">Reflection saved.</p>
        )}
      </div>
    </form>
  );
}
