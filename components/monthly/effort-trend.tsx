// Effort trend — "is my effort rising or falling?" The last 90 days as faint
// daily weight bars with a 2px trailing 7-day rolling-average line on top.
// Custom SVG (like the heatmap), server-rendered, pure props; exact values
// live in the sr-only summary and per-bar tooltips.
import type { TrendPoint } from "@/lib/rollups";
import { CHART_GRID, CHART_TEXT, monthTicks, shortDate, shortMonthLabel } from "./prepare";

type Props = {
  points: TrendPoint[];
};

const WIDTH = 720;
const HEIGHT = 132;
const PAD_TOP = 8;
const PAD_BOTTOM = 20;
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM;

const BAR_COLOR = "var(--heat-1)";
const LINE_COLOR = "var(--frog-green-strong)";

export function EffortTrend({ points }: Props) {
  const empty = points.every((p) => p.weight === 0);
  const max = Math.max(...points.map((p) => Math.max(p.weight, p.rolling)), 1);
  const step = WIDTH / Math.max(points.length, 1);
  const barWidth = Math.max(1, step * 0.6);

  const y = (value: number) => PAD_TOP + PLOT_HEIGHT * (1 - value / max);
  const x = (i: number) => i * step + step / 2;

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.rolling).toFixed(1)}`)
    .join(" ");
  const ticks = monthTicks(points);

  const latest = points[points.length - 1];

  return (
    <section
      aria-labelledby="effort-trend-title"
      className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 id="effort-trend-title" className="text-sm font-semibold text-ink">
            Effort trend
          </h2>
          <p className="text-xs text-ink-muted">Last 90 days. Is my effort rising or falling?</p>
        </div>
        {!empty && latest && (
          <p className="text-xs text-ink-muted">
            7-day avg{" "}
            <span className="font-mono tabular-nums text-ink">
              {latest.rolling.toFixed(1)}
            </span>
          </p>
        )}
      </div>
      {empty ? (
        <p className="mt-3 text-sm text-ink-muted">Nothing logged in the last 90 days.</p>
      ) : (
        <>
          {/* 90 daily bars need real width to stay legible: on narrow
              screens the chart keeps a minimum width and scrolls inside
              its own container instead of squeezing. tabIndex lets keyboard
              users scroll the hidden portion (axe:
              scrollable-region-focusable). */}
          <div
            tabIndex={0}
            role="region"
            aria-label="Effort trend chart, scrolls horizontally"
            className="mt-2 overflow-x-auto overscroll-x-contain"
          >
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full min-w-[560px]"
            role="img"
            aria-label={`Daily effort weight for the last ${points.length} days with a 7-day rolling average, currently ${latest?.rolling.toFixed(1) ?? "0"}`}
          >
            <line
              x1={0}
              x2={WIDTH}
              y1={y(0)}
              y2={y(0)}
              stroke={CHART_GRID}
              strokeWidth={1}
            />
            {points.map(
              (p, i) =>
                p.weight > 0 && (
                  <rect
                    key={p.date}
                    x={x(i) - barWidth / 2}
                    y={y(p.weight)}
                    width={barWidth}
                    height={y(0) - y(p.weight)}
                    rx={1}
                    fill={BAR_COLOR}
                  >
                    <title>{`${shortDate(p.date)}: weight ${p.weight}, 7-day avg ${p.rolling.toFixed(1)}`}</title>
                  </rect>
                ),
            )}
            <path d={line} fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeLinejoin="round" />
            {ticks.map((date) => {
              const i = points.findIndex((p) => p.date === date);
              // Clamp so a tick near either edge keeps its centered label
              // inside the viewBox instead of clipping ("May" -> "ay").
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
                  {shortMonthLabel(date)}
                </text>
              );
            })}
          </svg>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: BAR_COLOR }} />
              Daily weight
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: LINE_COLOR }} />
              7-day average
            </span>
          </p>
        </>
      )}
    </section>
  );
}
