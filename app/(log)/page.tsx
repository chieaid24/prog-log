// The daily log dashboard (PRD 3.1): heatmap + calendar over the same
// Entries, one shared day selection, quick add always at hand.
import Link from "next/link";
import { DayDetail } from "@/components/day-detail/day-detail";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { LogSheet } from "@/components/quick-add/log-sheet";
import { QuickAddForm } from "@/components/quick-add/quick-add-form";
import { MomentumPanel } from "@/components/streak/momentum-panel";
import { ThrowbackFeed } from "@/components/throwback/throwback-feed";
import { YearHeatmap } from "@/components/heatmap/year-heatmap";
import { addDays, endOfMonth, startOfMonth, todayInTimeZone } from "@/lib/dates";
import { getActiveProjects, getEntriesInRange, getUserTimezone } from "@/lib/queries";
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
  const view = single(params.view) === "calendar" ? "calendar" : "heatmap";
  const rawMonth = single(params.month);
  const rawDay = single(params.day);
  const selectedDay = rawDay && DAY_RE.test(rawDay) ? rawDay : null;

  const supabase = await createClient();
  const timezone = await getUserTimezone(supabase);
  const today = todayInTimeZone(timezone);
  const monthStart =
    rawMonth && MONTH_RE.test(rawMonth) ? `${rawMonth}-01` : startOfMonth(today);

  // One fetch covers the trailing heatmap year, the viewed month (with its
  // leading/trailing grid days) and today.
  const from = min(addDays(today, -371), addDays(monthStart, -7));
  const to = max(today, addDays(endOfMonth(monthStart), 7));
  const [entries, projects] = await Promise.all([
    getEntriesInRange(supabase, from, to),
    getActiveProjects(supabase),
  ]);

  const heatmapCells = toHeatmapCells(
    entries.filter((e) => e.entry_date >= addDays(today, -364) && e.entry_date <= today),
  );
  const calendarCards = toCalendarDayProjects(entries);
  const dayEntries = selectedDay
    ? entries.filter((e) => e.entry_date === selectedDay)
    : [];

  const monthQuery = `&month=${monthStart.slice(0, 7)}`;
  const dayQuery = selectedDay ? `&day=${selectedDay}` : "";
  const closeHref =
    view === "calendar" ? `/?view=calendar${monthQuery}` : `/?view=heatmap`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-5">
        {/* A segmented pair of links, not ARIA tabs: each option is a real
            navigation (?view=), and links don't get the arrow-key behavior
            the tab role promises. aria-current marks the active view. */}
        <nav
          aria-label="Daily log view"
          className="grid w-fit grid-cols-2 gap-1 rounded-lg bg-surface-sunken p-1 text-sm"
        >
          <Link
            aria-current={view === "heatmap" ? "page" : undefined}
            href={`/?view=heatmap${dayQuery}`}
            className={`rounded-md px-4 py-1.5 transition-colors pointer-coarse:py-2.5 ${
              view === "heatmap"
                ? "border border-border bg-surface font-medium text-ink"
                : "border border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            Heatmap
          </Link>
          <Link
            aria-current={view === "calendar" ? "page" : undefined}
            href={`/?view=calendar${monthQuery}${dayQuery}`}
            className={`rounded-md px-4 py-1.5 transition-colors pointer-coarse:py-2.5 ${
              view === "calendar"
                ? "border border-border bg-surface font-medium text-ink"
                : "border border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            Calendar
          </Link>
        </nav>

        <section
          aria-label={view === "heatmap" ? "Year heatmap" : "Month calendar"}
          className="rounded-xl border border-border bg-surface p-4"
        >
          {view === "heatmap" ? (
            <YearHeatmap cells={heatmapCells} todayISO={today} selectedDay={selectedDay} />
          ) : (
            <MonthCalendar
              monthStart={monthStart}
              todayISO={today}
              cards={calendarCards}
              selectedDay={selectedDay}
            />
          )}
        </section>

        {selectedDay && (
          <DayDetail
            date={selectedDay}
            entries={dayEntries}
            projects={projects}
            closeHref={closeHref}
          />
        )}
      </div>

      <aside className="flex flex-col gap-6">
        {/* On phones this card gives way to the floating log button + sheet
            below; the form itself is identical. */}
        <section
          aria-label="Log today"
          className="hidden rounded-xl border border-border bg-surface p-4 lg:block"
        >
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Log today</h2>
          <QuickAddForm projects={projects} />
        </section>
        <ThrowbackFeed />
        <MomentumPanel />
      </aside>

      <LogSheet projects={projects} />
    </div>
  );
}

function min(a: string, b: string): string {
  return a < b ? a : b;
}

function max(a: string, b: string): string {
  return a > b ? a : b;
}
