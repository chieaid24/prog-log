import Link from "next/link";
import { ViewToggle } from "@/components/log/view-toggle";
import { Frog } from "@/components/ui/frog";
import { humanDate, parseISODate } from "@/lib/dates";
import { intensityLevel } from "@/lib/rollups";
import type { HeatmapCell } from "@/lib/types";
import { buildHeatmapGrid, resolveHeatmapRange, type HeatmapRange } from "./grid";

const CELL = 12;
const GAP = 3;
const TOP = 18;
const LEFT = 30;

export const LEVEL_FILL = [
  "var(--heat-0)",
  "var(--heat-1)",
  "var(--heat-2)",
  "var(--heat-3)",
] as const;

type Props = {
  cells: HeatmapCell[];
  todayISO: string;
  range?: HeatmapRange;
  calendarMonth?: string;
  preservedDay?: string | null;
};

export function YearHeatmap({
  cells,
  todayISO,
  range = resolveHeatmapRange(todayISO),
  calendarMonth,
  preservedDay,
}: Props) {
  const step = CELL + GAP;
  const byDate = new Map(cells.map((cell) => [cell.date, cell]));
  const columns = buildHeatmapGrid(range);
  const width = LEFT + columns.length * step;
  const height = TOP + 7 * step;
  const currentYear = Number(todayISO.slice(0, 4));
  const previousYear = (range.year ?? currentYear) - 1;
  const nextHref =
    range.year === null
      ? null
      : range.year < currentYear - 1
        ? heatmapHref(range.year + 1, calendarMonth, preservedDay)
        : heatmapHref(undefined, calendarMonth, preservedDay);
  const calendarHref = calendarMonth
    ? `/?view=calendar&month=${calendarMonth.slice(0, 7)}${preservedDay ? `&day=${preservedDay}` : ""}`
    : `/?view=calendar${preservedDay ? `&day=${preservedDay}` : ""}`;
  const currentHeatmapHref = heatmapHref(range.year ?? undefined, calendarMonth, preservedDay);
  const trailingHref = heatmapHref(undefined, calendarMonth, preservedDay);

  return (
    <div>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight">Recent activity</h2>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <nav aria-label="Heatmap year navigation" className="flex items-center gap-1 text-sm">
            <Link
              href={heatmapHref(previousYear, calendarMonth, preservedDay)}
              aria-label={`Show ${previousYear}`}
              className="rounded-md border border-border bg-surface px-2 py-1 text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:px-3 pointer-coarse:py-3"
            >
              &larr;
            </Link>
            <Link
              href={trailingHref}
              aria-current={range.year === null ? "page" : undefined}
              className="rounded-md border border-border bg-surface px-2 py-1 text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:px-3 pointer-coarse:py-3"
            >
              This year
            </Link>
            {nextHref ? (
              <Link
                href={nextHref}
                aria-label="Show next year"
                className="rounded-md border border-border bg-surface px-2 py-1 text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:px-3 pointer-coarse:py-3"
              >
                &rarr;
              </Link>
            ) : (
              <span
                aria-label="No newer activity"
                aria-disabled="true"
                className="rounded-md border border-border bg-surface px-2 py-1 text-ink-faint pointer-coarse:px-3 pointer-coarse:py-3"
              >
                &rarr;
              </span>
            )}
          </nav>
          <ViewToggle
            current="heatmap"
            heatmapHref={currentHeatmapHref}
            calendarHref={calendarHref}
          />
        </div>
      </header>

      <div data-testid="heatmap-fit" className="w-full">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMinYMin meet"
          className="block h-auto w-full"
          style={{ maxWidth: width }}
          aria-label={`Year heatmap of logged effort, ${cells.length} logged days`}
        >
          {columns.map((column, x) =>
            column.monthLabel && x < columns.length - 1 ? (
              <text
                key={`m-${column.weekStart}`}
                x={LEFT + x * step}
                y={11}
                className="fill-[var(--ink-muted)] font-mono text-[10px]"
              >
                {column.monthLabel}
              </text>
            ) : null,
          )}
          {["Mon", "Wed", "Fri"].map((label, index) => (
            <text
              key={label}
              x={0}
              y={TOP + (1 + index * 2) * step + Math.round(CELL * 0.75)}
              className="fill-[var(--ink-muted)] font-mono text-[9px]"
            >
              {label}
            </text>
          ))}
          {columns.map((column, x) =>
            column.days.map((day) => {
              const cell = byDate.get(day);
              const level = intensityLevel(cell?.weight ?? 0);
              const label = cell
                ? `${humanDate(day)}: ${cell.entries} ${cell.entries === 1 ? "entry" : "entries"}, weight ${cell.weight}`
                : `${humanDate(day)}: no entries`;
              const isToday = day === todayISO;

              return (
                <rect
                  key={day}
                  x={LEFT + x * step}
                  y={TOP + parseISODate(day).getUTCDay() * step}
                  width={CELL}
                  height={CELL}
                  rx={2.5}
                  fill={LEVEL_FILL[level]}
                  stroke={isToday ? "var(--ink)" : "transparent"}
                  strokeWidth={isToday ? 1.5 : 0}
                  data-date={day}
                  data-level={level}
                  aria-label={label}
                  className="transition-opacity hover:opacity-80"
                >
                  <title>{label}</title>
                </rect>
              );
            }),
          )}
        </svg>
      </div>

      <div className="mt-1 flex items-center justify-between gap-3">
        {cells.length > 0 ? (
          <span />
        ) : (
          <p className="flex items-center gap-2.5 text-xs text-ink-muted">
            <Frog size={28} />
            Nothing logged yet. Ferdy is waiting for your first Entry.
          </p>
        )}
        <div
          className="flex items-center gap-1 font-mono text-xs text-ink-muted"
          aria-hidden="true"
        >
          <span className="mr-1">Less</span>
          {LEVEL_FILL.map((fill) => (
            <span
              key={fill}
              className="inline-block h-3 w-3 rounded-[2.5px]"
              style={{ backgroundColor: fill }}
            />
          ))}
          <span className="ml-1">More</span>
        </div>
      </div>
    </div>
  );
}

function heatmapHref(year?: number, calendarMonth?: string, preservedDay?: string | null): string {
  const yearQuery = year === undefined ? "" : `&year=${year}`;
  const monthQuery = calendarMonth ? `&month=${calendarMonth.slice(0, 7)}` : "";
  const dayQuery = preservedDay ? `&day=${preservedDay}` : "";
  return `/?view=heatmap${yearQuery}${monthQuery}${dayQuery}`;
}
