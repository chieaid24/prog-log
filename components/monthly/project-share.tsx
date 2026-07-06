// Project share — "where did the month's effort go?" One 100%-width bar in
// entity colors with 2px surface gaps; every segment direct-labeled in the
// legend list below (identity is never color-alone). Server-rendered.
import type { ShareSegment } from "./prepare";

type Props = {
  segments: ShareSegment[];
};

export function ProjectShare({ segments }: Props) {
  const totalPct = segments.reduce((n, s) => n + s.pct, 0);

  return (
    <section
      aria-labelledby="project-share-title"
      className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4"
    >
      <h2 id="project-share-title" className="text-sm font-semibold text-ink">
        Project share
      </h2>
      <p className="text-xs text-ink-muted">Where did the month&apos;s effort go?</p>
      {segments.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No Entries this month.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={segments.map((s) => `${s.name} ${s.pct}%`).join(", ")}
            className="mt-3 flex h-2.5 overflow-hidden rounded-full"
          >
            {segments.map((s) => (
              <div
                key={s.name}
                title={`${s.name}: ${s.pct}% (weight ${s.weight})`}
                className="border-r-2 border-surface last:border-r-0"
                style={{ width: `${(s.pct / totalPct) * 100}%`, background: s.color }}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
            {segments.map((s) => (
              <li key={s.name} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-sm" style={{ background: s.color }} />
                {s.name} <span className="font-mono tabular-nums text-ink">{s.pct}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
