// The Momentum card (ADR-0011): global logging streak + per-project cadence,
// in the dashboard aside next to the quick-add that extends it. Self-contained
// server component, same idiom as <ThrowbackFeed/>.
import { ProjectChip } from "@/components/ui/project-chip";
import { todayInTimeZone } from "@/lib/dates";
import { getAllProjects, getEntryDatesWithProject, getUserTimezone } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { prepareMomentum, type MomentumRow } from "./prepare";

const DIRECTION: Record<MomentumRow["momentum"]["direction"], { glyph: string; label: string; tone: string }> = {
  rising: { glyph: "▲", label: "rising", tone: "text-success" },
  steady: { glyph: "─", label: "steady", tone: "text-muted" },
  cooling: { glyph: "▼", label: "cooling", tone: "text-faint" },
};

export async function MomentumPanel() {
  const supabase = await createClient();
  const timezone = await getUserTimezone(supabase);
  const today = todayInTimeZone(timezone);
  const [pairs, projects] = await Promise.all([
    getEntryDatesWithProject(supabase),
    getAllProjects(supabase),
  ]);
  const { overall, rows } = prepareMomentum(pairs, projects, today);

  return (
    <section
      aria-labelledby="momentum-title"
      className="rounded-2xl border border-line bg-panel p-4"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="momentum-title" className="text-sm font-semibold tracking-tight text-foreground">
          Momentum
        </h2>
        {overall.current > 0 && (
          <p className="text-xs font-medium text-accent">
            {overall.current}-day streak
          </p>
        )}
      </div>

      {overall.totalDays === 0 ? (
        <p className="mt-3 text-sm text-faint">
          Log a day and your streak starts counting.
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-faint">
            longest {overall.longest} · {overall.totalDays} days logged
          </p>
          {rows.length > 0 && (
            <ul className="mt-3 flex flex-col divide-y divide-line">
              {rows.map((row) => {
                const d = DIRECTION[row.momentum.direction];
                return (
                  <li key={row.projectId} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                    <ProjectChip name={row.projectName} color={row.color} />
                    <span className="ml-auto flex items-center gap-2 text-xs tabular-nums">
                      {row.streak >= 2 && (
                        <span className="text-accent" title={`${row.streak} consecutive days`}>
                          {row.streak}d run
                        </span>
                      )}
                      <span className="text-faint">{row.momentum.daysLast14}/14</span>
                      <span aria-label={d.label} title={d.label} className={d.tone}>
                        {d.glyph}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
