import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveHeatmapRange } from "@/components/heatmap/grid";
import { YearHeatmap } from "@/components/heatmap/year-heatmap";
import { EffortTrend } from "@/components/monthly/effort-trend";
import { TREND_DAYS } from "@/components/monthly/prepare";
import { CommitmentSplitDonut } from "@/components/projects/commitment-split-donut";
import {
  buildCommitmentSplit,
  buildProjectMilestones,
} from "@/components/projects/detail-prepare";
import { ProjectMilestoneTimeline } from "@/components/projects/milestone-timeline";
import { Frog } from "@/components/ui/frog";
import { addDays } from "@/lib/dates";
import { getAllEntries, getAllProjects, getToday } from "@/lib/queries";
import { toHeatmapCells, toTrend } from "@/lib/rollups";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Project detail" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ProjectDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const [projects, entries, today] = await Promise.all([
    getAllProjects(supabase),
    getAllEntries(supabase),
    getToday(supabase),
  ]);
  const project = projects.find((candidate) => candidate.id === id);
  if (!project) notFound();

  const projectEntries = entries.filter((entry) => entry.project_id === project.id);
  const range = resolveHeatmapRange(today);
  const heatmapEntries = projectEntries.filter(
    (entry) => entry.entry_date >= range.start && entry.entry_date <= range.end,
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Link
        href="/projects"
        className="self-start rounded-lg text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frog-green pointer-coarse:py-3"
      >
        &larr; Projects
      </Link>
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <span
            aria-hidden
            data-testid="project-color"
            className="size-3 shrink-0 rounded-full"
            style={{ background: project.color ?? "var(--ink-faint)" }}
          />
          <h1 className="text-2xl font-bold tracking-tight text-ink">{project.name}</h1>
          {project.category && (
            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-ink-muted">
              {project.category}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-muted">All-time history for this Project.</p>
      </header>

      {projectEntries.length === 0 ? (
        <section
          aria-label="Empty Project"
          className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-4 py-10 text-center"
        >
          <Frog size={44} />
          <p className="max-w-sm text-sm text-ink-muted">
            No Entries yet. Log work for this Project and its history will appear here.
          </p>
        </section>
      ) : (
        <>
          <section
            aria-label="Year heatmap"
            className="rounded-xl border border-border bg-surface p-4"
          >
            <YearHeatmap
              cells={toHeatmapCells(heatmapEntries)}
              todayISO={today}
              range={range}
              title="Year heatmap"
              showControls={false}
              emptyMessage="Nothing logged for this Project in the trailing year."
            />
          </section>

          <EffortTrend
            points={toTrend(projectEntries, addDays(today, -(TREND_DAYS - 1)), today)}
          />

          <div className="grid items-start gap-5 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
            <CommitmentSplitDonut segments={buildCommitmentSplit(projectEntries)} />
            <ProjectMilestoneTimeline rows={buildProjectMilestones(projectEntries, today)} />
          </div>
        </>
      )}
    </div>
  );
}
