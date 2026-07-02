// Month calendar (PRD 3.1.2): Notion-quiet grid, one compact card per
// project per day (dominant first — rollup pre-orders), cap 3 + overflow.
// Server component: all interaction is links, sharing ?day= with the heatmap.
import Link from "next/link";
import { addDays, addMonths, monthTitle, weekdayMondayFirst } from "@/lib/dates";
import type { CalendarDayProject } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CARD_CAP = 3;

type Props = {
  /** First day of the displayed month (ISO). */
  monthStart: string;
  todayISO: string;
  cards: CalendarDayProject[];
  selectedDay?: string | null;
};

function monthHref(monthStart: string): string {
  return `/?view=calendar&month=${monthStart.slice(0, 7)}`;
}

function dayHref(monthStart: string, day: string): string {
  return `${monthHref(monthStart)}&day=${day}`;
}

export function MonthCalendar({ monthStart, todayISO, cards, selectedDay }: Props) {
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

  const hasAnyCards = cards.some((c) => c.date.slice(0, 7) === month);

  return (
    <div>
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">{monthTitle(monthStart)}</h2>
        <nav aria-label="Calendar navigation" className="flex items-center gap-1 text-sm">
          <Link
            href={monthHref(addMonths(monthStart, -1))}
            aria-label="Previous month"
            className="rounded-md border border-line px-2 py-1 text-muted transition-colors hover:bg-panel-raised hover:text-foreground"
          >
            ←
          </Link>
          <Link
            href={monthHref(todayISO)}
            className="rounded-md border border-line px-2 py-1 text-muted transition-colors hover:bg-panel-raised hover:text-foreground"
          >
            Today
          </Link>
          <Link
            href={monthHref(addMonths(monthStart, 1))}
            aria-label="Next month"
            className="rounded-md border border-line px-2 py-1 text-muted transition-colors hover:bg-panel-raised hover:text-foreground"
          >
            →
          </Link>
        </nav>
      </header>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 border-b border-line pb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2 text-right text-[11px] font-medium text-faint">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7" role="grid" aria-label={monthTitle(monthStart)}>
            {days.map((day) => {
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
                  className={`min-h-24 border-b border-r border-line p-1.5 first:border-l ${
                    day === selectedDay ? "bg-accent-soft" : ""
                  } ${inMonth ? "" : "opacity-40"}`}
                >
                  <div className="mb-1 flex justify-end">
                    <Link
                      href={dayHref(monthStart, day)}
                      aria-label={`Open ${day}`}
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs transition-colors hover:bg-panel-raised ${
                        isToday
                          ? "bg-accent font-semibold text-background"
                          : inMonth
                            ? "text-muted"
                            : "text-faint"
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
                        className="group flex items-center gap-1.5 rounded-md border border-line bg-panel px-1.5 py-1 transition-colors hover:bg-panel-raised"
                      >
                        <span
                          className="h-3.5 w-[3px] shrink-0 rounded-full"
                          style={{ backgroundColor: card.color ?? "var(--accent)" }}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate text-[11px] leading-tight">
                          {card.projectName}
                        </span>
                        {card.hasMilestone && (
                          <span
                            aria-label="Has milestone"
                            title="Milestone"
                            className="text-[9px] text-amber-300"
                          >
                            ✦
                          </span>
                        )}
                        <span className="text-[10px] font-semibold uppercase text-faint group-hover:text-muted">
                          {card.timeSpent[0]}
                        </span>
                      </Link>
                    ))}
                    {overflow > 0 && (
                      <Link
                        href={dayHref(monthStart, day)}
                        className="rounded px-1.5 text-[10px] text-faint transition-colors hover:text-muted"
                      >
                        +{overflow} more
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!hasAnyCards && (
        <p className="mt-3 text-sm text-faint">
          Nothing logged this month yet — click a day to add an entry.
        </p>
      )}
    </div>
  );
}
