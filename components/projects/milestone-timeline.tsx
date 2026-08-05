import { humanDate } from "@/lib/dates";
import { humanizeAge } from "@/lib/throwbacks";
import type { ProjectMilestoneRow } from "./detail-prepare";

type Props = {
  rows: ProjectMilestoneRow[];
};

export function ProjectMilestoneTimeline({ rows }: Props) {
  return (
    <section
      aria-labelledby="project-milestone-title"
      className="flex w-full flex-col gap-1 rounded-xl border border-border bg-surface p-4"
    >
      <h2 id="project-milestone-title" className="text-sm font-semibold text-ink">
        Milestone timeline
      </h2>
      <p className="text-xs text-ink-muted">All-time, oldest to newest.</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No Milestones yet.</p>
      ) : (
        <ol className="mt-3 flex flex-col divide-y divide-border">
          {rows.map((row) => (
            <li
              key={row.entryId}
              className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <p className="shrink-0 font-mono text-xs tabular-nums text-ink-muted sm:w-48">
                <time dateTime={row.date}>{humanDate(row.date)}</time>
                <span className="ml-2">{humanizeAge(row.daysAgo)}</span>
              </p>
              <p className="min-w-0 flex-1 text-sm leading-snug text-ink">{row.milestone}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
