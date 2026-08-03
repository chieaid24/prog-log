import { addDays, parseISODate } from "@/lib/dates";

export type HeatmapColumn = {
  weekStart: string;
  days: string[];
  monthLabel: string | null;
};

export type HeatmapRange = {
  start: string;
  end: string;
  year: number | null;
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function weekdaySundayFirst(iso: string): number {
  return parseISODate(iso).getUTCDay();
}

export function resolveHeatmapRange(
  todayISO: string,
  requestedYear?: string,
): HeatmapRange {
  const currentYear = Number(todayISO.slice(0, 4));
  const year = requestedYear && /^\d{4}$/.test(requestedYear) ? Number(requestedYear) : NaN;

  if (Number.isInteger(year) && year >= 1000 && year < currentYear) {
    return {
      start: `${requestedYear}-01-01`,
      end: `${requestedYear}-12-31`,
      year,
    };
  }

  return {
    start: addDays(todayISO, -364),
    end: todayISO,
    year: null,
  };
}

export function buildHeatmapGrid(range: Pick<HeatmapRange, "start" | "end">): HeatmapColumn[] {
  const firstSunday = addDays(range.start, -weekdaySundayFirst(range.start));
  const columns: HeatmapColumn[] = [];
  let previousMonth = -1;

  for (let weekStart = firstSunday; weekStart <= range.end; weekStart = addDays(weekStart, 7)) {
    const days: string[] = [];
    for (let offset = 0; offset < 7; offset++) {
      const day = addDays(weekStart, offset);
      if (day >= range.start && day <= range.end) days.push(day);
    }

    const month = parseISODate(days[0]).getUTCMonth();
    columns.push({
      weekStart,
      days,
      monthLabel: month !== previousMonth ? MONTH_SHORT[month] : null,
    });
    previousMonth = month;
  }

  if (columns[0]?.monthLabel && columns[1]?.monthLabel) {
    columns[0].monthLabel = null;
  }

  return columns;
}
