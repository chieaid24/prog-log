import type { Metadata } from "next";
import { ProjectManager, type ProjectUsage } from "@/components/projects/project-manager";
import { daysBetween } from "@/lib/dates";
import {
  getAllProjects,
  getEntryDatesWithProject,
  getProjectAliases,
  getToday,
} from "@/lib/queries";
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

  // Usage summary per project: count + last-logged age, from real Entries.
  // Through the read wrapper so DEMO_MODE answers from fixtures (ADR-0016).
  const entryRows = await getEntryDatesWithProject(supabase);

  const usage: Record<string, ProjectUsage> = {};
  for (const row of entryRows) {
    const u = usage[row.project_id] ?? { entries: 0, lastLoggedDaysAgo: null };
    u.entries += 1;
    const age = daysBetween(row.entry_date, today);
    u.lastLoggedDaysAgo =
      u.lastLoggedDaysAgo === null ? age : Math.min(u.lastLoggedDaysAgo, age);
    usage[row.project_id] = u;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Projects</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Archive instead of deleting; history stays intact.
        </p>
      </header>
      <ProjectManager projects={projects} usage={usage} aliases={aliases} />
    </div>
  );
}
