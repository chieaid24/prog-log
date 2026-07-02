import type { Metadata } from "next";
import { ProjectManager, type ProjectUsage } from "@/components/projects/project-manager";
import { daysBetween, todayInTimeZone } from "@/lib/dates";
import { getAllProjects, getUserTimezone } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const [projects, timezone] = await Promise.all([
    getAllProjects(supabase),
    getUserTimezone(supabase),
  ]);

  // Usage summary per project: count + last-logged age, from real Entries.
  const { data: entryRows, error } = await supabase
    .from("entries")
    .select("project_id, entry_date");
  if (error) throw error;

  const today = todayInTimeZone(timezone);
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
        <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-muted">
          Archive instead of deleting — history stays intact.
        </p>
      </header>
      <ProjectManager projects={projects} usage={usage} />
    </div>
  );
}
