// Cumulative overview (ADR-0023): current + longest streak beside the
// "how far I've come" curve — the running sum of Time Commitment weight over
// all history. Custom SVG like the effort trend: server-rendered, pure props,
// static (no motion, so prefers-reduced-motion needs nothing to disable);
// exact values live in per-marker titles and the aria summary.
import { CHART_GRID, CHART_TEXT } from "@/components/monthly/prepare";
import type { StreakSummary } from "@/lib/streaks";
import { cumulativeTicks, momentDate, type CumulativePoint } from "./prepare";

type Props = {
  points: CumulativePoint[];
  streaks: StreakSummary;
};

const WIDTH = 720;
const HEIGHT = 140;
const PAD_TOP = 8;
const PAD_BOTTOM = 20;
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM;

const LINE_COLOR = "var(--frog-green-strong)";
const AREA_COLOR = "var(--frog-green-soft)";

export function CumulativeEffort({ points, streaks }: Props) {
  const latest = points[points.length - 1];
  const max = Math.max(latest?.total ?? 0, 1);

  // A single point (first day ever) centers as a dot; a line needs two.
  const x = (i: number) => (points.length === 1 ? WIDTH / 2 : (i / (points.length - 1)) * WIDTH);
  const y = (value: number) => PAD_TOP + PLOT_HEIGHT * (1 - value / max);

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;

  const ticks = cumulativeTicks(points);
  const indexByDate = new Map(points.map((p, i) => [p.date, i]));
  // Hover/focus detail: a marker per tick plus the latest point, each with an
  // exact-value title (dense histories stay legible; the markers sample).
  const markers = ticks
    .map((t) => ({ date: t.date, index: indexByDate.get(t.date) ?? 0 }))
    .concat(latest ? [{ date: latest.date, index: points.length - 1 }] : []);

  return (
    <section
      aria-labelledby="cumulative-effort-title"
      className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <h2 id="cumulative-effort-title" className="text-sm font-semibold text-ink">
            Cumulative effort
          </h2>
          <p className="text-xs text-ink-muted">
            All history, summed Time Commitment weight. It only climbs.
          </p>
        </div>
        <p className="font-mono text-xs tabular-nums text-ink-muted">
          {streaks.current > 0 && (
            <>
              <span className="font-medium text-frog-green-strong">
                {streaks.current}-day streak
              </span>
              {" · "}
            </>
          )}
          longest {streaks.longest}
        </p>
      </div>
      {points.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          Log your first Entry and the curve starts climbing.
        </p>
      ) : (
        <>
          {/* Long histories need real width: keep a minimum and scroll inside
              the container instead of squeezing. tabIndex lets keyboard users
              reach the hidden portion (axe: scrollable-region-focusable). */}
          <div
            tabIndex={0}
            role="region"
            aria-label="Cumulative effort chart, scrolls horizontally"
            className="mt-2 overflow-x-auto overscroll-x-contain"
          >
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="w-full min-w-[560px]"
              role="img"
              aria-label={`Cumulative effort over ${points.length} days, ${latest.total} total weight`}
            >
              <line x1={0} x2={WIDTH} y1={y(0)} y2={y(0)} stroke={CHART_GRID} strokeWidth={1} />
              {points.length >= 2 && (
                <>
                  <path d={area} fill={AREA_COLOR} stroke="none" />
                  <path
                    d={line}
                    fill="none"
                    stroke={LINE_COLOR}
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                </>
              )}
              {markers.map(({ date, index }) => (
                <circle
                  key={date}
                  cx={x(index)}
                  cy={y(points[index].total)}
                  r={2.5}
                  fill={LINE_COLOR}
                >
                  <title>{`${momentDate(date)}: ${points[index].total} total`}</title>
                </circle>
              ))}
              {ticks.map(({ date, label }) => {
                const i = indexByDate.get(date) ?? 0;
                // Clamp edge ticks so their centered labels stay inside the
                // viewBox instead of clipping.
                const cx = Math.min(Math.max(x(i), 16), WIDTH - 16);
                return (
                  <text
                    key={date}
                    x={cx}
                    y={HEIGHT - 6}
                    textAnchor="middle"
                    fontSize={13}
                    fill={CHART_TEXT}
                    fontFamily="var(--font-geist-mono)"
                  >
                    {label}
                  </text>
                );
              })}
            </svg>
          </div>
          <p className="text-xs text-ink-muted">
            <span className="font-mono tabular-nums text-ink">{latest.total}</span> total effort
            weight (Small 1, Medium 2, Large 3)
          </p>
        </>
      )}
    </section>
  );
}
