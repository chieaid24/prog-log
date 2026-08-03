// The daily log dashboard (PRD 3.1): calendar selection plus a read-only
// year heatmap, with quick add always at hand.
import { DayDetail } from "@/components/day-detail/day-detail";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { LogSheet } from "@/components/quick-add/log-sheet";
import { QuickAddForm } from "@/components/quick-add/quick-add-form";
import { MomentumPanel } from "@/components/streak/momentum-panel";
import { ThrowbackFeed } from "@/components/throwback/throwback-feed";
import { YearHeatmap } from "@/components/heatmap/year-heatmap";
import { resolveHeatmapRange } from "@/components/heatmap/grid";
import { addDays, endOfMonth, startOfMonth } from "@/lib/dates";
import { getActiveProjects, getDayReflection, getEntriesInRange, getToday } from "@/lib/queries";
import { toCalendarDayProjects, toHeatmapCells } from "@/lib/rollups";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const MONTH_RE = /^\d{4}-\d{2}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const view = single(params.view) === "heatmap" ? "heatmap" : "calendar";
  const rawMonth = single(params.month);
  const rawDay = single(params.day);
  const preservedDay = rawDay && DAY_RE.test(rawDay) ? rawDay : null;
  const selectedDay = view === "calendar" ? preservedDay : null;

  const supabase = await createClient();
  const today = await getToday(supabase);
  const monthStart =
    rawMonth && MONTH_RE.test(rawMonth) ? `${rawMonth}-01` : startOfMonth(today);
  const heatmapRange = resolveHeatmapRange(today, single(params.year));

  const from = view === "heatmap" ? heatmapRange.start : addDays(monthStart, -7);
  const to = view === "heatmap" ? heatmapRange.end : addDays(endOfMonth(monthStart), 7);
  const [entries, projects, todayReflection, dayReflection] = await Promise.all([
    getEntriesInRange(supabase, from, to),
    getActiveProjects(supabase),
    getDayReflection(supabase, today),
    selectedDay ? getDayReflection(supabase, selectedDay) : null,
  ]);

  const heatmapCells = toHeatmapCells(entries);
  const calendarCards = toCalendarDayProjects(entries);
  const dayEntries = selectedDay
    ? entries.filter((e) => e.entry_date === selectedDay)
    : [];

  const monthQuery = `&month=${monthStart.slice(0, 7)}`;
  const dayQuery = preservedDay ? `&day=${preservedDay}` : "";
  const heatmapHref = `/?view=heatmap${monthQuery}${dayQuery}`;
  const closeHref = `/?view=calendar${monthQuery}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-5">
        <section
          aria-label={view === "heatmap" ? "Year heatmap" : "Month calendar"}
          className="rounded-xl border border-border bg-surface p-4"
        >
          {view === "heatmap" ? (
            <YearHeatmap
              cells={heatmapCells}
              todayISO={today}
              range={heatmapRange}
              calendarMonth={monthStart}
              preservedDay={preservedDay}
            />
          ) : (
            <MonthCalendar
              monthStart={monthStart}
              todayISO={today}
              cards={calendarCards}
              selectedDay={selectedDay}
              heatmapHref={heatmapHref}
            />
          )}
        </section>

        {selectedDay && (
          // Keyed by day so switching days resets the panel's form state
          // (draft milestone or reflection text never leaks across days).
          <DayDetail
            key={selectedDay}
            date={selectedDay}
            entries={dayEntries}
            projects={projects}
            reflection={dayReflection?.reflection ?? null}
            closeHref={closeHref}
          />
        )}
      </div>

      <aside className="flex min-w-0 flex-col gap-6">
        {/* On phones this card gives way to the floating log button + sheet
            below; the form itself is identical. */}
        <section
          aria-label="Log today"
          className="hidden rounded-xl border border-border bg-surface p-4 lg:block"
        >
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Log today</h2>
          <QuickAddForm projects={projects} reflection={todayReflection?.reflection ?? null} />
        </section>
        <ThrowbackFeed />
        <MomentumPanel />
      </aside>

      {/* With a day selected, the day panel carries its own capture form on
          the same screen; the fixed button would float right over those
          controls at 390px and steal their taps. */}
      {!selectedDay && (
        <LogSheet projects={projects} reflection={todayReflection?.reflection ?? null} />
      )}
    </div>
  );
}
