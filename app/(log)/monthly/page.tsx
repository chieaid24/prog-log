// Monthly breakdown (PRD 3.3): "how did I spend my month?" One fetch covers
// the displayed month and the 90-day effort trend; every chart below gets a
// pure prepared series (components/monthly/prepare.ts), so this page is only
// param parsing + data plumbing.
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
import { todayInTimeZone } from "@/lib/dates";
import { getEntriesInRange, getUserTimezone } from "@/lib/queries";
import {
  toProjectMonthSplits,
  toProjectShares,
  toTrend,
  toWeekdayPattern,
} from "@/lib/rollups";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MonthlyPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const supabase = await createClient();
  const timezone = await getUserTimezone(supabase);
  const today = todayInTimeZone(timezone);
  const monthStart = parseMonthParam(single(params.month), today);
  const window = monthWindow(monthStart, today);

  const entries = await getEntriesInRange(supabase, window.from, window.to);
  const inMonth = monthEntries(entries, monthStart);

  const nav = buildMonthNav(monthStart, today);
  const stat = monthStat(entries, monthStart);
  const split = timeSplit(inMonth);
  const stackRows = buildStackRows(toProjectMonthSplits(entries, monthStart));
  const shareSegments = buildShareSegments(toProjectShares(entries, monthStart));
  const weekdayRows = buildWeekdayRows(toWeekdayPattern(inMonth));
  const trendPoints = toTrend(entries, window.trendFrom, today);
  const milestoneRows = buildMilestoneRows(inMonth);

  return (
    <div className="flex flex-col gap-5">
      {/* Title and controls wrap as whole units: long month names ("January
          2024" plus the This month link) overflow 390px, and mid-label wraps
          read as broken. The controls drop to a right-aligned second line
          instead. */}
      <nav aria-label="Month" className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h1 className="mr-auto whitespace-nowrap text-2xl font-bold tracking-tight text-ink">
          {nav.title}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {!nav.isCurrentMonth && (
            <Link
              href="/monthly"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink pointer-coarse:py-2.5"
            >
              This month
            </Link>
          )}
          <Link
            aria-label="Previous month"
            href={`/monthly?month=${nav.prev}`}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:px-4 pointer-coarse:py-2.5"
          >
            &larr;
          </Link>
          <Link
            aria-label="Next month"
            href={`/monthly?month=${nav.next}`}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:px-4 pointer-coarse:py-2.5"
          >
            &rarr;
          </Link>
        </div>
      </nav>

      <StatTiles stat={stat} split={split} />

      <EffortTrend points={trendPoints} />

      <div className="grid gap-5 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        <ProjectStack rows={stackRows} />
        <div className="flex min-w-0 flex-col gap-5">
          <ProjectShare segments={shareSegments} />
          <WeekdayPattern rows={weekdayRows} />
        </div>
      </div>

      <MilestoneList rows={milestoneRows} />
    </div>
  );
}
