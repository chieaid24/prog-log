// Weekday pattern — "which days do I actually work?" Plain HTML bars (one
// hue, magnitude by length), the peak selectively direct-labeled, exact
// counts on hover/focus. Server-rendered, pure props.
import type { WeekdayRow } from "./prepare";

type Props = {
  rows: WeekdayRow[];
};

export function WeekdayPattern({ rows }: Props) {
  const max = Math.max(...rows.map((r) => r.weight), 1);
  const empty = rows.every((r) => r.weight === 0);

  return (
    <section
      aria-labelledby="weekday-pattern-title"
      className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4"
    >
      <h2 id="weekday-pattern-title" className="text-sm font-semibold text-ink">
        Weekday pattern
      </h2>
      <p className="text-xs text-ink-muted">Which days do I actually work?</p>
      {empty ? (
        <p className="mt-3 text-sm text-ink-faint">No Entries this month.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-1.5">
          {rows.map((row) => (
            <li
              key={row.label}
              title={`${row.label}: ${row.entries} ${row.entries === 1 ? "Entry" : "Entries"}, weight ${row.weight}`}
              aria-label={`${row.label}: ${row.entries} entries, weight ${row.weight}`}
              className="grid grid-cols-[2.5rem_1fr] items-center gap-2"
            >
              <span
                className={`font-mono text-xs tabular-nums ${row.isPeak ? "font-medium text-ink" : "text-ink-muted"}`}
              >
                {row.label}
              </span>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2.5 rounded-full transition-[width]"
                  style={{
                    width: `${(row.weight / max) * 100}%`,
                    minWidth: row.weight > 0 ? "4px" : "0",
                    background: row.isPeak ? "var(--heat-3)" : "var(--heat-1)",
                  }}
                />
                {row.isPeak && (
                  <span className="whitespace-nowrap font-mono text-xs tabular-nums text-ink-muted">
                    {row.entries} {row.entries === 1 ? "Entry" : "Entries"}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
