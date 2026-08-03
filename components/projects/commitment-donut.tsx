"use client";

// All-time Time Commitment-share donut — "where has the effort gone, ever?"
// One slice per active Project with logged effort, sized by summed weight
// (S/M/L = 1/2/3) in the Project's own entity color. Identity is never
// color-alone: the dot+name legend and tooltip carry the names, and an
// sr-only table mirrors the data.
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_SURFACE } from "@/components/monthly/prepare";
import type { DonutSegment } from "./prepare";

type Props = {
  segments: DonutSegment[];
  /** Active Projects overall, so "no Projects" and "no Entries" read apart. */
  activeProjectCount: number;
};

const CHART_HEIGHT = 220;

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: DonutSegment }>;
};

function DonutTooltip({ active, payload }: TooltipProps) {
  const segment = payload?.[0]?.payload;
  if (!active || !segment) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-overlay">
      <p className="flex items-center gap-1.5 font-medium text-ink">
        <span aria-hidden className="size-2 rounded-sm" style={{ background: segment.color }} />
        {segment.name}
      </p>
      <p className="mt-1.5 flex items-center gap-3 text-ink-muted">
        Share
        <span className="ml-auto font-mono tabular-nums text-ink">{segment.pct}%</span>
      </p>
      <p className="flex items-center gap-3 text-ink-muted">
        Weight
        <span className="ml-auto font-mono tabular-nums text-ink">{segment.weight}</span>
      </p>
    </div>
  );
}

export function CommitmentDonut({ segments, activeProjectCount }: Props) {
  return (
    <section
      aria-labelledby="commitment-donut-title"
      className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4"
    >
      <h2 id="commitment-donut-title" className="text-sm font-semibold text-ink">
        Time Commitment share
      </h2>
      <p className="text-xs text-ink-muted">All-time. Where has the effort gone?</p>
      {activeProjectCount === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          No active Projects yet. Create one below to start logging.
        </p>
      ) : segments.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No Entries logged yet.</p>
      ) : (
        <>
          {/* The sr-only table below is the accessible mirror; Recharts' own
              layer would inject svg[tabindex=0] inside this aria-hidden
              wrapper (axe: aria-hidden-focus). */}
          <div aria-hidden style={{ height: CHART_HEIGHT }} className="mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart accessibilityLayer={false}>
                <Pie
                  data={segments}
                  dataKey="weight"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="92%"
                  stroke={CHART_SURFACE}
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {segments.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
            {segments.map((s) => (
              <li key={s.name} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-sm" style={{ background: s.color }} />
                {s.name} <span className="font-mono tabular-nums text-ink">{s.pct}%</span>
              </li>
            ))}
          </ul>
          <table className="sr-only">
            <caption>All-time Time Commitment share per active Project</caption>
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Weight</th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s) => (
                <tr key={s.name}>
                  <th scope="row">{s.name}</th>
                  <td>{s.weight}</td>
                  <td>{s.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
