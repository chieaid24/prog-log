"use client";

// Year heatmap (PRD 3.1.1): one SVG, week columns Sunday-first, cell
// intensity = summed Time Commitment weight bucketed onto the heat ramp.
// Cells are keyboard-operable and select a day (?day=) shared with the
// calendar view.
import { useRouter } from "next/navigation";
import { Frog } from "@/components/ui/frog";
import { humanDate } from "@/lib/dates";
import { intensityLevel } from "@/lib/rollups";
import type { HeatmapCell } from "@/lib/types";
import { buildHeatmapGrid } from "./grid";

const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const TOP = 18; // month label row
const LEFT = 30; // weekday gutter

/** The DESIGN.md heat ramp: one hue climbing in lightness, heat-0..3. */
export const LEVEL_FILL = [
  "var(--heat-0)",
  "var(--heat-1)",
  "var(--heat-2)",
  "var(--heat-3)",
] as const;

type Props = {
  cells: HeatmapCell[];
  todayISO: string;
  selectedDay?: string | null;
};

export function YearHeatmap({ cells, todayISO, selectedDay }: Props) {
  const router = useRouter();
  const byDate = new Map(cells.map((c) => [c.date, c]));
  const columns = buildHeatmapGrid(todayISO);
  const width = LEFT + columns.length * STEP;
  const height = TOP + 7 * STEP;
  const hasAny = cells.length > 0;

  function select(day: string) {
    router.push(`/?view=heatmap&day=${day}`, { scroll: false });
  }

  return (
    <div>
      <div className="overflow-x-auto pb-1" data-testid="heatmap-scroll">
        <svg
          width={width}
          height={height}
          className="block"
          aria-label={`Year heatmap of logged effort, ${cells.length} logged days`}
        >
          {columns.map((col, x) =>
            col.monthLabel && x < columns.length - 1 ? (
              <text
                key={`m-${col.weekStart}`}
                x={LEFT + x * STEP}
                y={11}
                className="fill-[var(--ink-muted)] font-mono text-[10px]"
              >
                {col.monthLabel}
              </text>
            ) : null,
          )}
          {["Mon", "Wed", "Fri"].map((label, i) => (
            <text
              key={label}
              x={0}
              y={TOP + (1 + i * 2) * STEP + 9}
              className="fill-[var(--ink-faint)] font-mono text-[9px]"
            >
              {label}
            </text>
          ))}
          {columns.map((col, x) =>
            col.days.map((day, y) => {
              const cell = byDate.get(day);
              const level = intensityLevel(cell?.weight ?? 0);
              const label = cell
                ? `${humanDate(day)}: ${cell.entries} ${cell.entries === 1 ? "entry" : "entries"}, weight ${cell.weight}`
                : `${humanDate(day)}: no entries`;
              const selected = day === selectedDay;
              return (
                <rect
                  key={day}
                  x={LEFT + x * STEP}
                  y={TOP + y * STEP}
                  width={CELL}
                  height={CELL}
                  rx={2.5}
                  fill={LEVEL_FILL[level]}
                  stroke={selected ? "var(--ink)" : "transparent"}
                  strokeWidth={selected ? 1.5 : 0}
                  data-date={day}
                  data-level={level}
                  tabIndex={0}
                  role="button"
                  aria-label={label}
                  aria-pressed={selected}
                  className="cursor-pointer outline-offset-1 transition-opacity hover:opacity-80"
                  onClick={() => select(day)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      select(day);
                    }
                  }}
                >
                  <title>{label}</title>
                </rect>
              );
            }),
          )}
        </svg>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        {hasAny ? (
          <span />
        ) : (
          <p className="flex items-center gap-2.5 text-xs text-ink-muted">
            <Frog size={28} />
            Nothing logged yet. Ferdy is waiting for your first Entry.
          </p>
        )}
        <div
          className="flex items-center gap-1 font-mono text-xs text-ink-faint"
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
