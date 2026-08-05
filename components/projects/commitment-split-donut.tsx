"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_SURFACE } from "@/components/monthly/prepare";
import type { CommitmentSplitSegment } from "./detail-prepare";

type Props = {
  segments: CommitmentSplitSegment[];
};

const CHART_HEIGHT = 220;

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: CommitmentSplitSegment }>;
};

function SplitTooltip({ active, payload }: TooltipProps) {
  const segment = payload?.[0]?.payload;
  if (!active || !segment) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-overlay">
      <p className="flex items-center gap-1.5 font-medium text-ink">
        <span aria-hidden className="size-2 rounded-sm" style={{ background: segment.color }} />
        {segment.name}
      </p>
      <p className="mt-1.5 flex items-center gap-3 text-ink-muted">
        Entries
        <span className="ml-auto font-mono tabular-nums text-ink">{segment.count}</span>
      </p>
      <p className="flex items-center gap-3 text-ink-muted">
        Share
        <span className="ml-auto font-mono tabular-nums text-ink">{segment.pct}%</span>
      </p>
    </div>
  );
}

export function CommitmentSplitDonut({ segments }: Props) {
  return (
    <section
      aria-labelledby="commitment-split-title"
      className="flex w-full flex-col gap-1 rounded-xl border border-border bg-surface p-4"
    >
      <h2 id="commitment-split-title" className="text-sm font-semibold text-ink">
        Time Commitment split
      </h2>
      <p className="text-xs text-ink-muted">All-time. How Entries break down by size.</p>
      {segments.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No Entries logged yet.</p>
      ) : (
        <>
          <div aria-hidden style={{ height: CHART_HEIGHT }} className="mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart accessibilityLayer={false}>
                <Pie
                  data={segments}
                  dataKey="count"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="92%"
                  stroke={CHART_SURFACE}
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {segments.map((segment) => (
                    <Cell key={segment.size} fill={segment.color} />
                  ))}
                </Pie>
                <Tooltip content={<SplitTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
            {segments.map((segment) => (
              <li key={segment.size} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 rounded-sm"
                  style={{ background: segment.color }}
                />
                {segment.name}{" "}
                <span className="font-mono tabular-nums text-ink">
                  {segment.count} ({segment.pct}%)
                </span>
              </li>
            ))}
          </ul>
          <table className="sr-only">
            <caption>All-time Time Commitment split for this Project</caption>
            <thead>
              <tr>
                <th scope="col">Time Commitment</th>
                <th scope="col">Entries</th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((segment) => (
                <tr key={segment.size}>
                  <th scope="row">{segment.name}</th>
                  <td>{segment.count}</td>
                  <td>{segment.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
