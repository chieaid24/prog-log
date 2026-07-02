"use client";

// Day detail: the shared landing spot for a selected day from either view.
// Lists the day's Entries and hosts a date-bound quick add.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteEntryAction } from "@/app/actions/entries";
import { QuickAddForm } from "@/components/quick-add/quick-add-form";
import { humanDate } from "@/lib/dates";
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

  function remove(entryId: string, projectName: string) {
    if (!window.confirm(`Delete the ${projectName} entry for ${humanDate(date)}?`)) return;
    startTransition(async () => {
      await deleteEntryAction(entryId);
      router.refresh();
    });
  }

  return (
    <section
      aria-label={`Entries for ${humanDate(date)}`}
      className="rounded-2xl border border-line bg-panel p-4"
    >
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">{humanDate(date)}</h3>
        <button
          type="button"
          onClick={() => router.push(closeHref, { scroll: false })}
          aria-label="Close day detail"
          className="rounded-md px-2 py-1 text-sm text-faint transition-colors hover:bg-panel-raised hover:text-foreground"
        >
          ✕
        </button>
      </header>

      {entries.length === 0 ? (
        <p className="mb-4 text-sm text-faint">Nothing logged this day.</p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-line bg-panel px-3 py-2"
              data-testid="day-entry"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.project.color ?? "var(--accent)" }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {entry.project.name}
                </span>
                <span className="text-xs text-muted">{TIME_LABEL[entry.time_spent]}</span>
                <button
                  type="button"
                  onClick={() => remove(entry.id, entry.project.name)}
                  disabled={pending}
                  aria-label={`Delete ${entry.project.name} entry`}
                  className="rounded-md px-1.5 py-0.5 text-xs text-faint transition-colors hover:bg-panel-raised hover:text-danger disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
              {entry.milestone && (
                <p className="mt-1.5 flex items-start gap-1.5 text-sm">
                  <span aria-label="Milestone" title="Milestone" className="text-amber-300">
                    ✦
                  </span>
                  <span>{entry.milestone}</span>
                </p>
              )}
              {entry.description && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-faint transition-colors hover:text-muted">
                    detail
                  </summary>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
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
