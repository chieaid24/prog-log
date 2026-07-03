// Pure data prep for the dashboard Momentum card (ADR-0011). Turns the lean
// all-time (entry_date, project_id) feed into the global streak plus one
// cadence row per recently-active Project. No IO; fixed dates in tests.
import { computeMomentum, computeStreaks, type Momentum, type StreakSummary } from "@/lib/streaks";
import type { Project } from "@/lib/types";

export type MomentumRow = {
  projectId: string;
  projectName: string;
  color: string | null;
  momentum: Momentum;
  /** This Project's own consecutive-day run (the learning-project signal). */
  streak: number;
};

export type MomentumData = {
  overall: StreakSummary;
  rows: MomentumRow[];
};

/** How far back a Project can have last logged and still get a row (days). */
const ACTIVE_WINDOW = 28;

/**
 * Global streak + per-project momentum rows. Rows cover active (non-archived)
 * Projects with at least one Entry in the trailing 28 days, ordered by
 * cadence: most days-in-last-14 first, rising before cooling on ties, then
 * name for stability.
 */
export function prepareMomentum(
  pairs: ReadonlyArray<{ entry_date: string; project_id: string }>,
  projects: readonly Project[],
  todayISO: string,
): MomentumData {
  const overall = computeStreaks(
    pairs.map((p) => p.entry_date),
    todayISO,
  );

  const datesByProject = new Map<string, string[]>();
  for (const { entry_date, project_id } of pairs) {
    const list = datesByProject.get(project_id);
    if (list) list.push(entry_date);
    else datesByProject.set(project_id, [entry_date]);
  }

  const rows: MomentumRow[] = [];
  for (const project of projects) {
    if (project.status !== "active") continue;
    const dates = datesByProject.get(project.id);
    if (!dates) continue;
    const summary = computeStreaks(dates, todayISO);
    const momentum = computeMomentum(dates, todayISO);
    const daysSinceLast =
      summary.lastLogged === null
        ? Infinity
        : (Date.parse(`${todayISO}T00:00:00Z`) - Date.parse(`${summary.lastLogged}T00:00:00Z`)) /
          86_400_000;
    if (daysSinceLast > ACTIVE_WINDOW) continue;
    rows.push({
      projectId: project.id,
      projectName: project.name,
      color: project.color,
      momentum,
      streak: summary.current,
    });
  }

  const rank = { rising: 0, steady: 1, cooling: 2 } as const;
  rows.sort(
    (a, b) =>
      b.momentum.daysLast14 - a.momentum.daysLast14 ||
      rank[a.momentum.direction] - rank[b.momentum.direction] ||
      a.projectName.localeCompare(b.projectName),
  );

  return { overall, rows };
}
