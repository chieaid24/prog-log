import type { Metadata } from "next";
import { CommitmentDonut } from "@/components/projects/commitment-donut";
import { ComparisonBar } from "@/components/projects/comparison-bar";
import {
  buildComparisonRows,
  buildDonutSegments,
  buildStreakRows,
} from "@/components/projects/prepare";
import { ProjectManager, type ProjectUsage } from "@/components/projects/project-manager";
import { StreakStrip } from "@/components/projects/streak-strip";
import { daysBetween } from "@/lib/dates";
import { getAllEntries, getAllProjects, getProjectAliases, getToday } from "@/lib/queries";
import { toProjectShares, toProjectTotals } from "@/lib/rollups";
import { createClient } from "@/lib/supabase/server";
import type { ProjectAlias } from "@/lib/types";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const [projects, today, aliasRows] = await Promise.all([
    getAllProjects(supabase),
    getToday(supabase),
    getProjectAliases(supabase),
  ]);

  const aliases: Record<string, ProjectAlias[]> = {};
  for (const row of aliasRows) {
    (aliases[row.project_id] ??= []).push(row);
  }

  // One all-time fetch serves the overview charts and the usage summary.
  // Through the read wrapper so DEMO_MODE answers from fixtures (ADR-0016).
  const entries = await getAllEntries(supabase);

  // Usage summary per project: count + last-logged age, from real Entries.
  const usage: Record<string, ProjectUsage> = {};
  for (const row of entries) {
    const u = usage[row.project_id] ?? { entries: 0, lastLoggedDaysAgo: null };
    u.entries += 1;
    const age = daysBetween(row.entry_date, today);
    u.lastLoggedDaysAgo =
      u.lastLoggedDaysAgo === null ? age : Math.min(u.lastLoggedDaysAgo, age);
    usage[row.project_id] = u;
  }

  // All-time analytics home (ADR-0020): share across active Projects only.
  const activeEntries = entries.filter((e) => e.project.status === "active");
  const donutSegments = buildDonutSegments(toProjectShares(activeEntries));
  const activeProjects = projects.filter((p) => p.status === "active");
  const activeProjectCount = activeProjects.length;

  // Comparison bar + streak strip share one totals rollup (issue #63); the
  // seed keeps zero-Entry active Projects in both.
  const totals = toProjectTotals(activeEntries, activeProjects);
  const comparisonRows = buildComparisonRows(totals);
  const streakRows = buildStreakRows(totals, activeEntries, today);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Projects</h1>
        <p className="mt-1 text-sm text-ink-muted">
          All-time analytics for your Projects, and the list itself. Archive to preserve
          history, or permanently delete a Project after archiving it.
        </p>
      </header>
      <section aria-label="Overview" className="flex flex-col gap-5">
        <CommitmentDonut segments={donutSegments} activeProjectCount={activeProjectCount} />
        <ComparisonBar rows={comparisonRows} activeProjectCount={activeProjectCount} />
        <StreakStrip rows={streakRows} activeProjectCount={activeProjectCount} />
      </section>
      <ProjectManager projects={projects} usage={usage} aliases={aliases} />
    </div>
  );
}
