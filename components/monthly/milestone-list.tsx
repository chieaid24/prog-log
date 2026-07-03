// The month's Milestones: date, Project chip, Milestone text, in
// chronological order. Server-rendered, pure props.
import { ProjectChip } from "@/components/ui/project-chip";
import { shortDate, type MilestoneRow } from "./prepare";

type Props = {
  rows: MilestoneRow[];
};

export function MilestoneList({ rows }: Props) {
  return (
    <section
      aria-labelledby="milestone-list-title"
      className="flex flex-col gap-1 rounded-xl border border-line bg-panel p-4"
    >
      <h2 id="milestone-list-title" className="text-sm font-semibold text-foreground">
        Milestones
      </h2>
      <p className="text-xs text-muted">The month&apos;s headlines.</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-faint">No Milestones this month.</p>
      ) : (
        <ol className="mt-3 flex flex-col divide-y divide-line">
          {rows.map((row) => (
            <li
              key={row.entryId}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0"
            >
              <time
                dateTime={row.date}
                className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted"
              >
                {shortDate(row.date)}
              </time>
              <ProjectChip name={row.projectName} color={row.color} />
              <span className="min-w-0 flex-1 text-sm text-foreground">{row.milestone}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
