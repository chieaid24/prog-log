// Pure grid math for the year heatmap: trailing ~52 weeks ending today,
// Sunday-first week columns (GitHub convention), future days omitted.
import { addDays, parseISODate } from "@/lib/dates";

export type HeatmapColumn = {
  /** ISO date of the column's Sunday. */
  weekStart: string;
  /** Dates present in this column (up to 7; the last column stops at today). */
  days: string[];
  /** Month label to draw above this column, or null. */
  monthLabel: string | null;
};

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** 0 = Sunday ... 6 = Saturday. */
function weekdaySundayFirst(iso: string): number {
  return parseISODate(iso).getUTCDay();
}

/**
 * Build the trailing-year grid: the column list starts at the Sunday on or
 * before (today - 364 days) and ends with today's (partial) week. A month
 * label appears above a column when the month of its first day differs from
 * the previous column's.
 */
export function buildHeatmapGrid(todayISO: string): HeatmapColumn[] {
  const start = addDays(todayISO, -364);
  const firstSunday = addDays(start, -weekdaySundayFirst(start));
  const columns: HeatmapColumn[] = [];
  let prevMonth = -1;

  for (let weekStart = firstSunday; weekStart <= todayISO; weekStart = addDays(weekStart, 7)) {
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      if (day > todayISO) break;
      days.push(day);
    }
    const month = parseISODate(weekStart).getUTCMonth();
    columns.push({
      weekStart,
      days,
      monthLabel: month !== prevMonth ? MONTH_SHORT[month] : null,
    });
    prevMonth = month;
  }
  return columns;
}
