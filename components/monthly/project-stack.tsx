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
        <text x={-LABEL_WIDTH + 20} y={0} dy={3.5} fill={CHART_TEXT} fontSize={12}>
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
    <div className="rounded-lg border border-line-strong bg-background/95 px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground">{label}</p>
      <ul className="mt-1.5 flex flex-col gap-0.5">
        {TIME_SIZES.map((t) => (
          <li key={t} className="flex items-center gap-1.5 text-muted">
            <span aria-hidden className="size-2 rounded-sm" style={{ background: TIME_RAMP[t] }} />
            {TIME_LABEL[t]}
            <span className="ml-auto pl-3 tabular-nums text-foreground">
              {counts.get(t) ?? 0}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 border-t border-line pt-1 text-muted">
        {total} {total === 1 ? "Entry" : "Entries"}
      </p>
    </div>
  );
}

export function ProjectStack({ rows }: Props) {
  return (
    <section
      aria-labelledby="project-stack-title"
      className="flex flex-col gap-1 rounded-xl border border-line bg-panel p-4"
    >
      <h2 id="project-stack-title" className="text-sm font-semibold text-foreground">
        Projects by Time Commitment
      </h2>
      <p className="text-xs text-muted">Which Projects carried the month?</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-faint">No Entries this month.</p>
      ) : (
        <>
          <div aria-hidden style={{ height: rows.length * ROW_HEIGHT + 30 }} className="mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 0, right: 12, bottom: 0, left: 8 }}
                barCategoryGap="28%"
              >
                <CartesianGrid horizontal={false} stroke={CHART_GRID} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: CHART_TEXT, fontSize: 11 }}
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
                  cursor={{ fill: "rgba(148, 163, 199, 0.06)" }}
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
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
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
