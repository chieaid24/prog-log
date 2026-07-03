// The public "now" page (PRD §8 stretch; ADR-0009): a read-only,
// portfolio-embeddable answer to "what am I working on?", regenerated hourly.
// The select below is the entire publication surface — Project name/category/
// color and Entry date/size/Milestone. Descriptions are never fetched.
import type { Metadata } from "next";
import { DEFAULT_TIMEZONE, addDays, todayInTimeZone } from "@/lib/dates";
import {
  NOW_WINDOW_DAYS,
  prepareNowItems,
  shortDate,
  type NowProject,
  type NowSourceEntry,
} from "@/lib/now";
import { createAdminClient } from "@/lib/supabase/admin";
import { humanizeAge } from "@/lib/throwbacks";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Now",
  description:
    "What I'm working on right now — recent milestones and deep-work days, straight from my daily work log.",
};

async function fetchNowProjects(): Promise<NowProject[]> {
  const owner = process.env.OWNER_USER_ID;
  if (!owner) return [];

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("app_settings")
    .select("timezone")
    .eq("user_id", owner)
    .maybeSingle();
  const today = todayInTimeZone(settings?.timezone ?? DEFAULT_TIMEZONE);

  const { data, error } = await admin
    .from("entries")
    .select("entry_date, time_spent, milestone, project:projects(name, category, color)")
    .eq("user_id", owner)
    .gte("entry_date", addDays(today, -NOW_WINDOW_DAYS))
    .lte("entry_date", today)
    .or("milestone.not.is.null,time_spent.eq.large")
    .order("entry_date");
  if (error) throw error;

  const rows: NowSourceEntry[] = (data as unknown as Array<{
    entry_date: string;
    time_spent: NowSourceEntry["timeSpent"];
    milestone: string | null;
    project: { name: string; category: string | null; color: string | null };
  }>).map((row) => ({
    entryDate: row.entry_date,
    timeSpent: row.time_spent,
    milestone: row.milestone,
    projectName: row.project.name,
    category: row.project.category,
    color: row.project.color,
  }));

  return prepareNowItems(rows, today);
}

export default async function NowPage() {
  const projects = await fetchNowProjects();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">What I&rsquo;m working on</h1>
        <p className="text-sm text-muted">
          Milestones and deep-work days from the last {NOW_WINDOW_DAYS} days of my work log.
        </p>
      </header>

      {projects.length === 0 ? (
        <section
          aria-label="Quiet lately"
          className="rounded-2xl border border-line bg-panel p-6"
        >
          <p className="text-sm text-muted">Building quietly at the moment.</p>
          <p className="mt-1 text-sm text-faint">
            New milestones will surface here as they land.
          </p>
        </section>
      ) : (
        <ol className="flex flex-col gap-4">
          {projects.map((project) => (
            <li
              key={project.projectName}
              className="rounded-2xl border border-line bg-panel p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color ?? "var(--accent)" }}
                  />
                  <h2 className="text-base font-semibold tracking-tight">
                    {project.projectName}
                  </h2>
                  {project.category && (
                    <span className="text-xs uppercase tracking-wide text-faint">
                      {project.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-faint">
                  active {humanizeAge(project.daysSinceActive)}
                </p>
              </div>

              {project.milestones.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2">
                  {project.milestones.map((milestone) => (
                    <li
                      key={`${milestone.date}-${milestone.text}`}
                      className="flex items-baseline gap-3"
                    >
                      <span className="w-12 shrink-0 text-xs tabular-nums text-faint">
                        {shortDate(milestone.date)}
                      </span>
                      <span className="text-sm leading-snug text-foreground">
                        {milestone.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {project.deepWorkDays > 0 && (
                <p className="mt-3 text-xs text-muted">
                  <span className="text-accent">{project.deepWorkDays}</span> deep-work{" "}
                  {project.deepWorkDays === 1 ? "day" : "days"} in the window
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      <footer className="text-xs text-faint">
        Generated from the log itself — updated hourly.
      </footer>
    </main>
  );
}
