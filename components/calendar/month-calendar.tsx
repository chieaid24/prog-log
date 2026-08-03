// Month calendar (PRD 3.1.2): one compact card per project and day,
// dominant first, capped at three plus overflow. Date links own selection.
import Link from "next/link";
import { ViewToggle } from "@/components/log/view-toggle";
import { addDays, addMonths, monthTitle, weekdayMondayFirst } from "@/lib/dates";
import { TIME_LABEL, type CalendarDayProject } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CARD_CAP = 3;

type Props = {
  /** First day of the displayed month (ISO). */
  monthStart: string;
  todayISO: string;
  cards: CalendarDayProject[];
  selectedDay?: string | null;
  heatmapHref?: string;
};

function monthHref(monthStart: string): string {
  return `/?view=calendar&month=${monthStart.slice(0, 7)}`;
}

function dayHref(monthStart: string, day: string): string {
  return `${monthHref(monthStart)}&day=${day}`;
}

export function MonthCalendar({
  monthStart,
  todayISO,
  cards,
  selectedDay,
  heatmapHref = "/?view=heatmap",
}: Props) {
  const byDate = new Map<string, CalendarDayProject[]>();
  for (const card of cards) {
    const list = byDate.get(card.date) ?? [];
    list.push(card);
    byDate.set(card.date, list);
  }

  // Build 7-column rows: lead from the Monday on/before the 1st, trail to
  // complete the final week. Adjacent-month days render muted, without cards.
  const lead = weekdayMondayFirst(monthStart);
  const first = addDays(monthStart, -lead);
  const month = monthStart.slice(0, 7);
  const days: string[] = [];
  for (let d = first; ; d = addDays(d, 1)) {
    days.push(d);
    if (d.slice(0, 7) > month && weekdayMondayFirst(d) === 6) break;
    if (days.length > 42) break; // safety: 6 weeks max
  }

  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const hasAnyCards = cards.some((c) => c.date.slice(0, 7) === month);

  return (
    <div>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold leading-[1.2] tracking-[-0.01em]">
          {monthTitle(monthStart)}
        </h2>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <nav aria-label="Calendar navigation" className="flex items-center gap-1 text-sm">
            <Link
              href={monthHref(addMonths(monthStart, -1))}
              aria-label="Previous month"
              className="rounded-md border border-border bg-surface px-2 py-1 text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:px-3 pointer-coarse:py-3"
            >
              &larr;
            </Link>
            <Link
              href={monthHref(todayISO)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:px-3 pointer-coarse:py-3"
            >
              Today
            </Link>
            <Link
              href={monthHref(addMonths(monthStart, 1))}
              aria-label="Next month"
              className="rounded-md border border-border bg-surface px-2 py-1 text-ink-muted transition-colors hover:border-border-strong hover:text-ink pointer-coarse:px-3 pointer-coarse:py-3"
            >
              &rarr;
            </Link>
          </nav>
          <ViewToggle
            current="calendar"
            heatmapHref={heatmapHref}
            calendarHref={selectedDay ? dayHref(monthStart, selectedDay) : monthHref(monthStart)}
          />
        </div>
      </header>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 border-b border-border pb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2 text-right font-mono text-[11px] font-medium text-ink-muted">
                {w}
              </div>
            ))}
          </div>
          {/* Weeks carry role=row (required between grid and gridcell);
              display:contents keeps the 7-column CSS grid laying out cells
              directly. first:border-l now applies per week row, closing the
              grid's left edge on every row. */}
          <div className="grid grid-cols-7" role="grid" aria-label={monthTitle(monthStart)}>
            {weeks.map((week) => (
              <div key={week[0]} role="row" className="contents">
                {week.map((day) => {
                  const inMonth = day.slice(0, 7) === month;
                  const isToday = day === todayISO;
                  const dayCards = inMonth ? (byDate.get(day) ?? []) : [];
                  const overflow = dayCards.length - CARD_CAP;
                  return (
                    <div
                      key={day}
                      role="gridcell"
                      data-date={day}
                      aria-current={isToday ? "date" : undefined}
                      className={`min-h-24 border-b border-r border-border p-1.5 first:border-l ${
                        day === selectedDay ? "bg-frog-green-soft" : ""
                      } ${inMonth ? "" : "bg-surface-sunken/40"}`}
                    >
                      <div className="mb-1 flex justify-end">
                        <Link
                          href={dayHref(monthStart, day)}
                          aria-label={`Open ${day}`}
                          className={`tap flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs transition-colors hover:bg-surface-sunken ${
                            isToday
                              ? "bg-ink font-semibold text-paper hover:bg-ink"
                              : inMonth
                                ? "text-ink"
                                : "text-ink-muted"
                          }`}
                        >
                          {Number(day.slice(8, 10))}
                        </Link>
                      </div>
                      <div className="flex flex-col gap-1">
                        {dayCards.slice(0, CARD_CAP).map((card) => (
                          <Link
                            key={card.projectId}
                            href={dayHref(monthStart, day)}
                            data-testid="calendar-card"
                            aria-label={`${card.projectName}, ${TIME_LABEL[card.timeSpent]}${
                              card.hasMilestone ? ", milestone" : ""
                            }`}
                            className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-surface-sunken pointer-coarse:py-1.5"
                          >
                            <span
                              className="size-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: card.color ?? "var(--ink-faint)" }}
                              aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1 truncate text-[11px] leading-tight">
                              {card.projectName}
                            </span>
                            {card.hasMilestone && (
                              <span
                                aria-label="Has milestone"
                                title="Milestone"
                                className="text-[9px] text-frog-green-strong"
                              >
                                ✦
                              </span>
                            )}
                            <span className="font-mono text-[10px] font-semibold uppercase text-ink-muted group-hover:text-ink">
                              {card.timeSpent[0]}
                            </span>
                          </Link>
                        ))}
                        {overflow > 0 && (
                          <Link
                            href={dayHref(monthStart, day)}
                            className="rounded px-1.5 py-0.5 font-mono text-[10px] text-ink-muted transition-colors hover:text-ink pointer-coarse:py-1"
                          >
                            +{overflow} more
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {!hasAnyCards && (
        <p className="mt-3 text-sm text-ink-muted">
          Nothing logged this month yet. Click a day to add an Entry.
        </p>
      )}
    </div>
  );
}
