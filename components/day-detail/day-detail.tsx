"use client";

// Day detail: the shared landing spot for a selected day from either view.
// Lists the day's Entries and hosts a date-bound quick add.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteEntryAction } from "@/app/actions/entries";
import { QuickAddForm } from "@/components/quick-add/quick-add-form";
import { humanDate } from "@/lib/dates";
import { isDemoNotice } from "@/lib/demo/mode";
import { TIME_LABEL, type EntryWithProject, type Project } from "@/lib/types";

type Props = {
  date: string;
  entries: EntryWithProject[];
  projects: Project[];
  /** Preserved query params (view/month) for the close link. */
  closeHref: string;
};

export function DayDetail({ date, entries, projects, closeHref }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  function remove(entryId: string, projectName: string) {
    if (!window.confirm(`Delete the ${projectName} entry for ${humanDate(date)}?`)) return;
    setNotice(null);
    startTransition(async () => {
      const result = await deleteEntryAction(entryId);
      if (isDemoNotice(result)) {
        setNotice(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section
      aria-label={`Entries for ${humanDate(date)}`}
      className="rounded-xl border border-border bg-surface p-4"
    >
      <header className="mb-3 flex items-center justify-between">
        <h3 className="font-mono text-sm font-semibold tracking-tight">{humanDate(date)}</h3>
        <button
          type="button"
          onClick={() => router.push(closeHref, { scroll: false })}
          aria-label="Close day detail"
          className="tap rounded-md px-2 py-1 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          ✕
        </button>
      </header>

      {notice && (
        <p aria-live="polite" className="mb-3 text-sm text-ink-muted">
          {notice}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="mb-4 text-sm text-ink-muted">Nothing logged this day.</p>
      ) : (
        <ul className="mb-4 flex flex-col divide-y divide-border">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="py-2.5 first:pt-0 last:pb-0"
              data-testid="day-entry"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.project.color ?? "var(--ink-faint)" }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {entry.project.name}
                </span>
                <span className="font-mono text-xs text-ink-muted">{TIME_LABEL[entry.time_spent]}</span>
                <button
                  type="button"
                  onClick={() => remove(entry.id, entry.project.name)}
                  disabled={pending}
                  aria-label={`Delete ${entry.project.name} entry`}
                  className="tap rounded-md px-1.5 py-0.5 text-xs text-ink-muted transition-colors hover:text-danger-red disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
              {entry.milestone && (
                <p className="mt-1.5 flex items-start gap-1.5 text-sm">
                  <span aria-label="Milestone" title="Milestone" className="text-frog-green-strong">
                    ✦
                  </span>
                  <span>{entry.milestone}</span>
                </p>
              )}
              {entry.description && (
                <details className="mt-1">
                  <summary className="tap cursor-pointer rounded-md text-xs text-ink-muted transition-colors hover:text-ink-muted">
                    detail
                  </summary>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                    {entry.description}
                  </p>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      <QuickAddForm projects={projects} date={date} />
    </section>
  );
}
