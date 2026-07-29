// The Throwback feed (PRD 3.4): up to 3 past Milestones or Reflections
// resurfaced with humanized ages. Self-contained server component - it does
// its own fetch, so the dashboard just slots it in. Selection is date-seeded
// per today (user timezone): refreshing never reshuffles, and the morning
// Discord digest's single item is always this feed's first card.
import { ProjectChip } from "@/components/ui/project-chip";
import { getThrowbackPool, getToday } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { humanizeAge, pickThrowbacks } from "@/lib/throwbacks";

export async function ThrowbackFeed() {
  const supabase = await createClient();
  const today = await getToday(supabase);
  const pool = await getThrowbackPool(supabase, today);
  const items = pickThrowbacks(pool, today);

  return (
    <section
      aria-labelledby="throwback-feed-title"
      className="rounded-xl border border-border bg-surface p-4"
    >
      <h2
        id="throwback-feed-title"
        className="text-sm font-semibold tracking-tight text-ink"
      >
        Throwbacks
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          Milestones and reflections will resurface here on future days.
        </p>
      ) : (
        <ol className="mt-3 flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li
              key={item.kind === "milestone" ? item.entryId : `reflection-${item.entryDate}`}
              className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0"
            >
              <p className="font-mono text-xs font-medium text-frog-green-strong">
                {humanizeAge(item.daysAgo)}
              </p>
              {item.kind === "milestone" ? (
                <>
                  <p className="text-sm leading-snug text-ink">{item.milestone}</p>
                  <div className="flex items-center gap-2">
                    <ProjectChip name={item.projectName} color={item.color} />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm italic leading-snug text-ink">{item.reflection}</p>
                  <p className="font-mono text-xs font-medium text-ink-muted">Daily reflection</p>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
