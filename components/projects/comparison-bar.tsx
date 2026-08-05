"use client";

// All-time per-Project comparison bar - "how do my Projects compare, ever?"
// One row per active Project (dominant first), two horizontal bars per row:
// Entry count (tinted) and total effort weight (solid), both in the Project's
// entity color. Identity lives in the row label (dot + name), never the fill;
// mono value labels sit at each bar's end; a tooltip carries both metrics and
// an sr-only table mirrors the data.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_GRID, CHART_TEXT } from "@/components/monthly/prepare";
import type { ComparisonRow } from "./prepare";

type Props = {
  rows: ComparisonRow[];
  /** Active Projects overall, so "no Projects" and "no Entries" read apart. */
  activeProjectCount: number;
};

const ROW_HEIGHT = 46;
const LABEL_WIDTH = 138;
/** The Entries bar is the same hue, tinted, so the pair reads as one Project. */
const ENTRIES_OPACITY = 0.45;

type TickProps = {
  x?: number | string;
  y?: number | string;
  payload?: { value?: number | string };
};

/** Row label: entity color dot + Project name. */
function projectTick(rows: ComparisonRow[]) {
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
  return name.length > 16 ? `${name.slice(0, 15)}\u2026` : name;
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: ComparisonRow }>;
};

function CompareTooltip({ active, payload }: TooltipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-overlay">
      <p className="flex items-center gap-1.5 font-medium text-ink">
        <span aria-hidden className="size-2 rounded-sm" style={{ background: row.color }} />
        {row.name}
      </p>
      <p className="mt-1.5 flex items-center gap-3 text-ink-muted">
        Entries
        <span className="ml-auto font-mono tabular-nums text-ink">{row.entries}</span>
      </p>
      <p className="flex items-center gap-3 text-ink-muted">
        Effort weight
        <span className="ml-auto font-mono tabular-nums text-ink">{row.weight}</span>
      </p>
    </div>
  );
}

export function ComparisonBar({ rows, activeProjectCount }: Props) {
  const hasEntries = rows.some((r) => r.entries > 0);
  return (
    <section
      aria-labelledby="comparison-bar-title"
      className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-surface p-4"
    >
      <h2 id="comparison-bar-title" className="text-sm font-semibold text-ink">
        Project comparison
      </h2>
      <p className="text-xs text-ink-muted">
        All-time. Entries and effort weight per active Project.
      </p>
      {activeProjectCount === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          No active Projects yet. Create one below to start logging.
        </p>
      ) : !hasEntries ? (
        <p className="mt-3 text-sm text-ink-muted">No Entries logged yet.</p>
      ) : (
        <>
          {/* The 138px label gutter plus bars needs ~30rem to breathe; on
              narrower screens the chart scrolls in its own container.
              tabIndex keeps that scroll keyboard-operable (axe:
              scrollable-region-focusable). */}
          <div
            tabIndex={0}
            role="region"
            aria-label="Project comparison chart, scrolls horizontally"
            className="mt-2 overflow-x-auto overscroll-x-contain"
          >
            {/* The sr-only table below is the accessible mirror; Recharts' own
                layer would inject svg[tabindex=0] inside this aria-hidden
                wrapper (axe: aria-hidden-focus). */}
            <div
              aria-hidden
              style={{ height: rows.length * ROW_HEIGHT + 30 }}
              className="min-w-[30rem]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows}
                  layout="vertical"
                  margin={{ top: 0, right: 40, bottom: 0, left: 8 }}
                  barCategoryGap="24%"
                  barGap={2}
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
                    content={<CompareTooltip />}
                    cursor={{ fill: "oklch(0.27 0.012 80 / 0.05)" }}
                  />
                  <Bar dataKey="entries" name="Entries" isAnimationActive={false}>
                    {rows.map((r) => (
                      <Cell key={r.name} fill={r.color} fillOpacity={ENTRIES_OPACITY} />
                    ))}
                    <LabelList
                      dataKey="entries"
                      position="right"
                      fill={CHART_TEXT}
                      fontSize={12}
                      fontFamily="var(--font-geist-mono)"
                    />
                  </Bar>
                  <Bar dataKey="weight" name="Effort weight" isAnimationActive={false}>
                    {rows.map((r) => (
                      <Cell key={r.name} fill={r.color} />
                    ))}
                    <LabelList
                      dataKey="weight"
                      position="right"
                      fill={CHART_TEXT}
                      fontSize={12}
                      fontFamily="var(--font-geist-mono)"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-sm bg-ink-muted opacity-45" />
              Entries
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-sm bg-ink-muted" />
              Effort weight
            </span>
          </p>
          <table className="sr-only">
            <caption>All-time Entries and effort weight per active Project</caption>
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Entries</th>
                <th scope="col">Effort weight</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <th scope="row">{r.name}</th>
                  <td>{r.entries}</td>
                  <td>{r.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
