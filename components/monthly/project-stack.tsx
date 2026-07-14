"use client";

// Per-project stacked bar — "which Projects carried the month?" Horizontal
// rows (one per Project, weight order), stacked by Time Commitment in the
// validated S/M/L ordinal ramp. Identity lives in the row label (name + entity
// color dot), never in the fill; tooltips carry exact counts; an sr-only table
// mirrors the data.
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TIME_LABEL, TIME_SIZES } from "@/lib/types";
import { CHART_GRID, CHART_SURFACE, CHART_TEXT, TIME_RAMP, type StackRow } from "./prepare";

type Props = {
  rows: StackRow[];
};

const ROW_HEIGHT = 34;
const LABEL_WIDTH = 138;

type TickProps = {
  x?: number | string;
  y?: number | string;
  payload?: { value?: number | string };
};

/** Row label: entity color dot + Project name. */
function projectTick(rows: StackRow[]) {
  function ProjectTick({ x = 0, y = 0, payload }: TickProps) {
    const name = String(payload?.value ?? "");
    const row = rows.find((r) => r.name === name);
    return (
      <g transform={`translate(${Number(x)},${Number(y)})`}>
        <circle cx={-LABEL_WIDTH + 10} cy={0} r={3} fill={row?.color ?? CHART_TEXT} />
        <text
          x={-LABEL_WIDTH + 20}
          y={0}
          dy={4}
          fill={CHART_TEXT}
          fontSize={13}
          fontFamily="var(--font-geist-mono)"
        >
          {truncate(name)}
        </text>
      </g>
    );
  }
  return ProjectTick;
}

function truncate(name: string): string {
  return name.length > 16 ? `${name.slice(0, 15)}…` : name;
}

type TooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ dataKey?: string | number; value?: number | string }>;
};

function StackTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const counts = new Map(payload.map((p) => [p.dataKey, Number(p.value ?? 0)]));
  const total = TIME_SIZES.reduce((n, t) => n + (counts.get(t) ?? 0), 0);
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-overlay">
      <p className="font-medium text-ink">{label}</p>
      <ul className="mt-1.5 flex flex-col gap-0.5">
        {TIME_SIZES.map((t) => (
          <li key={t} className="flex items-center gap-1.5 text-ink-muted">
            <span aria-hidden className="size-2 rounded-sm" style={{ background: TIME_RAMP[t] }} />
            {TIME_LABEL[t]}
            <span className="ml-auto pl-3 font-mono tabular-nums text-ink">
              {counts.get(t) ?? 0}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 border-t border-border pt-1 text-ink-muted">
        {total} {total === 1 ? "Entry" : "Entries"}
      </p>
    </div>
  );
}

export function ProjectStack({ rows }: Props) {
  return (
    <section
      aria-labelledby="project-stack-title"
      className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-surface p-4"
    >
      <h2 id="project-stack-title" className="text-sm font-semibold text-ink">
        Projects by Time Commitment
      </h2>
      <p className="text-xs text-ink-muted">Which Projects carried the month?</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No Entries this month.</p>
      ) : (
        <>
          {/* The 138px label gutter plus bars needs ~30rem to breathe; on
              narrower screens the chart scrolls in its own container.
              tabIndex keeps that scroll keyboard-operable (axe:
              scrollable-region-focusable). */}
          <div
            tabIndex={0}
            role="region"
            aria-label="Projects by Time Commitment chart, scrolls horizontally"
            className="mt-2 overflow-x-auto overscroll-x-contain"
          >
          <div aria-hidden style={{ height: rows.length * ROW_HEIGHT + 30 }} className="min-w-[30rem]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 0, right: 12, bottom: 0, left: 8 }}
                barCategoryGap="28%"
                // The sr-only table below is the accessible mirror; Recharts'
                // own layer would inject svg[tabindex=0] inside this
                // aria-hidden wrapper (axe: aria-hidden-focus).
                accessibilityLayer={false}
              >
                <CartesianGrid horizontal={false} stroke={CHART_GRID} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: CHART_TEXT, fontSize: 13, fontFamily: "var(--font-geist-mono)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={LABEL_WIDTH}
                  tick={projectTick(rows)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<StackTooltip />}
                  cursor={{ fill: "oklch(0.27 0.012 80 / 0.05)" }}
                />
                {TIME_SIZES.map((t) => (
                  <Bar
                    key={t}
                    dataKey={t}
                    name={TIME_LABEL[t]}
                    stackId="commitment"
                    fill={TIME_RAMP[t]}
                    stroke={CHART_SURFACE}
                    strokeWidth={1}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
            {TIME_SIZES.map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 rounded-sm"
                  style={{ background: TIME_RAMP[t] }}
                />
                {TIME_LABEL[t]}
              </span>
            ))}
          </p>
          <table className="sr-only">
            <caption>Entries per Project by Time Commitment</caption>
            <thead>
              <tr>
                <th scope="col">Project</th>
                {TIME_SIZES.map((t) => (
                  <th key={t} scope="col">
                    {TIME_LABEL[t]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <th scope="row">{row.name}</th>
                  {TIME_SIZES.map((t) => (
                    <td key={t}>{row[t]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
