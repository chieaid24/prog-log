// Per-Project streak / momentum strip - the all-time cadence read on the
// Projects overview. One row per active Project (dominant first, matching the
// comparison bar): current consecutive-day run plus rising/steady/cooling
// from two trailing 14-day windows (shared ADR-0011 math). Identity is the
// chip (dot + name); direction pairs a glyph with its word, never color alone.
import Link from "next/link";
import { ProjectChip } from "@/components/ui/project-chip";
import type { StreakRow } from "./prepare";

type Props = {
  rows: StreakRow[];
  /** Active Projects overall, so "no Projects" and "no Entries" read apart. */
  activeProjectCount: number;
};

const DIRECTION: Record<
  StreakRow["momentum"]["direction"],
  { label: string; tone: string; glyph: React.ReactNode }
> = {
  rising: {
    label: "rising",
    tone: "text-frog-green-strong",
    glyph: <path d="M5 2.5 L8.5 8 H1.5 Z" fill="currentColor" />,
  },
  steady: {
    label: "steady",
    tone: "text-ink-muted",
    glyph: <path d="M1.5 5 H8.5" stroke="currentColor" strokeWidth="1.5" />,
  },
  cooling: {
    label: "cooling",
    tone: "text-ink-muted",
    glyph: <path d="M5 7.5 L1.5 2 H8.5 Z" fill="currentColor" />,
  },
};

export function StreakStrip({ rows, activeProjectCount }: Props) {
  const hasEntries = rows.some((r) => r.hasEntries);
  return (
    <section
      aria-labelledby="streak-strip-title"
      className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4"
    >
      <h2 id="streak-strip-title" className="text-sm font-semibold text-ink">
        Streaks and momentum
      </h2>
      <p className="text-xs text-ink-muted">
        All-time. Current run per active Project, and its two-week trend.
      </p>
      {activeProjectCount === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          No active Projects yet. Create one below to start logging.
        </p>
      ) : !hasEntries ? (
        <p className="mt-3 text-sm text-ink-muted">No Entries logged yet.</p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-border">
          {rows.map((row) => {
            const d = DIRECTION[row.momentum.direction];
            return (
              <li key={row.projectId} className="py-1 first:pt-0 last:pb-0">
                <Link
                  href={`/projects/${row.projectId}`}
                  className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg py-1 transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frog-green pointer-coarse:min-h-11"
                >
                  <ProjectChip name={row.name} color={row.color} />
                  {row.hasEntries ? (
                    <span className="ml-auto flex items-center gap-3 font-mono text-xs tabular-nums">
                    <span
                      className={row.streak >= 2 ? "text-frog-green-strong" : "text-ink-muted"}
                      title={`${row.streak} consecutive logged ${row.streak === 1 ? "day" : "days"}`}
                    >
                      {row.streak}d streak
                    </span>
                    <span
                      className="text-ink-muted"
                      title={`${row.momentum.daysLast14} of the last 14 days logged`}
                    >
                      {row.momentum.daysLast14}/14
                    </span>
                    <span className={`inline-flex items-center gap-1 ${d.tone}`}>
                      <svg aria-hidden viewBox="0 0 10 10" className="size-2.5">
                        {d.glyph}
                      </svg>
                      {d.label}
                    </span>
                    </span>
                  ) : (
                    <span className="ml-auto text-xs text-ink-muted">No Entries yet</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
