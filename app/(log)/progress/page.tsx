// The Progress view (ADR-0023): the deliberate all-time browse of the
// qualitative record. A cumulative overview and the Reflection/Milestone
// timeline lead; the month-scoped analytics stay beneath as the "by the
// numbers" section. One all-time Entry fetch feeds every part (ADR-0007:
// pure prep over thin fetches), and the Reflection source reuses the
// Throwback pool (ADR-0017).
import type { Metadata } from "next";
import Link from "next/link";
import { EffortTrend } from "@/components/monthly/effort-trend";
import { MilestoneList } from "@/components/monthly/milestone-list";
import {
  buildMilestoneRows,
  buildMonthNav,
  buildShareSegments,
  buildStackRows,
  buildWeekdayRows,
  monthEntries,
  monthStat,
  monthWindow,
  parseMonthParam,
  timeSplit,
} from "@/components/monthly/prepare";
import { ProjectShare } from "@/components/monthly/project-share";
import { ProjectStack } from "@/components/monthly/project-stack";
import { StatTiles } from "@/components/monthly/stat-tiles";
import { WeekdayPattern } from "@/components/monthly/weekday-pattern";
import { CumulativeEffort } from "@/components/progress/cumulative-effort";
import { buildCumulativeEffort, buildTimeline } from "@/components/progress/prepare";
import { ProgressTimeline } from "@/components/progress/timeline";
import { addDays } from "@/lib/dates";
import { getAllEntries, getThrowbackPool, getToday } from "@/lib/queries";
import {
  toProjectMonthSplits,
  toProjectShares,
  toTrend,
  toWeekdayPattern,
} from "@/lib/rollups";
import { computeStreaks } from "@/lib/streaks";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProgressPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const supabase = await createClient();
  const today = await getToday(supabase);

  const [entries, pool] = await Promise.all([
    getAllEntries(supabase),
    // The pool's cutoff is exclusive; asking with tomorrow includes today's
    // Reflection. Its daysAgo ages are unused here.
    getThrowbackPool(supabase, addDays(today, 1)),
  ]);
  const reflections = pool.filter((item) => item.kind === "reflection");

  const moments = buildTimeline(entries, reflections, today);
  const cumulative = buildCumulativeEffort(entries, today);
  const streaks = computeStreaks(
    entries.map((e) => e.entry_date),
    today,
  );

  // The retained monthly analytics, unchanged from the old /monthly view.
  const monthStart = parseMonthParam(single(params.month), today);
  const window = monthWindow(monthStart, today);
  const inMonth = monthEntries(entries, monthStart);
  const nav = buildMonthNav(monthStart, today);
  const stat = monthStat(entries, monthStart);
  const split = timeSplit(inMonth);
  const stackRows = buildStackRows(toProjectMonthSplits(entries, monthStart));
  const shareSegments = buildShareSegments(toProjectShares(entries, monthStart));
  const weekdayRows = buildWeekdayRows(toWeekdayPattern(inMonth));
  const trendPoints = toTrend(entries, window.trendFrom, window.trendTo);
  const milestoneRows = buildMilestoneRows(inMonth);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Progress</h1>
        <p className="mt-1 text-sm text-ink-muted">
          What got done, newest first. Reflections and Milestones tell the story; the
          numbers sit below.
        </p>
      </header>

      <CumulativeEffort points={cumulative} streaks={streaks} />

      <ProgressTimeline moments={moments} />

      <section aria-label="Monthly analytics" className="flex flex-col gap-5">
        {/* Title and controls wrap as whole units: long month names plus the
            This month link overflow 390px, and mid-label wraps read as broken.
            The controls drop to a right-aligned second line instead. */}
        <nav
          aria-label="Month"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-5"
        >
          <div className="mr-auto">
            <h2 className="whitespace-nowrap text-xl font-bold tracking-tight text-ink">
              {nav.title}
            </h2>
            <p className="text-xs text-ink-muted">By the numbers</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!nav.isCurrentMonth && (
              <Link
                href="/progress"
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink pointer-coarse:py-3"
              >
                This month
              </Link>
            )}
            <Link
              aria-label="Previous month"
              href={`/progress?month=${nav.prev}`}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:px-4 pointer-coarse:py-3"
            >
              &larr;
            </Link>
            <Link
              aria-label="Next month"
              href={`/progress?month=${nav.next}`}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:px-4 pointer-coarse:py-3"
            >
              &rarr;
            </Link>
          </div>
        </nav>

        <StatTiles stat={stat} split={split} />

        <EffortTrend
          points={trendPoints}
          subtitle={
            nav.isCurrentMonth
              ? undefined
              : `The 90 days to the end of ${nav.title}. Was my effort rising or falling?`
          }
        />

        <div className="grid gap-5 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
          <ProjectStack rows={stackRows} />
          <div className="flex min-w-0 flex-col gap-5">
            <ProjectShare segments={shareSegments} />
            <WeekdayPattern rows={weekdayRows} />
          </div>
        </div>

        <MilestoneList rows={milestoneRows} />
      </section>
    </div>
  );
}
