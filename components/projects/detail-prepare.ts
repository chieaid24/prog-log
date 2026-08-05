import { TIME_RAMP } from "@/components/monthly/prepare";
import { daysBetween } from "@/lib/dates";
import { TIME_LABEL, TIME_SIZES, type EntryWithProject, type TimeSize } from "@/lib/types";

export type CommitmentSplitSegment = {
  size: TimeSize;
  name: string;
  color: string;
  count: number;
  pct: number;
};

export function buildCommitmentSplit(
  entries: readonly Pick<EntryWithProject, "time_spent">[],
): CommitmentSplitSegment[] {
  if (entries.length === 0) return [];

  const counts: Record<TimeSize, number> = { small: 0, medium: 0, large: 0 };
  for (const entry of entries) counts[entry.time_spent] += 1;

  return TIME_SIZES.map((size) => ({
    size,
    name: TIME_LABEL[size],
    color: TIME_RAMP[size],
    count: counts[size],
    pct: Math.round((counts[size] / entries.length) * 100),
  }));
}

export type ProjectMilestoneRow = {
  entryId: string;
  date: string;
  daysAgo: number;
  milestone: string;
};

export function buildProjectMilestones(
  entries: readonly EntryWithProject[],
  todayISO: string,
): ProjectMilestoneRow[] {
  return entries
    .filter((entry): entry is EntryWithProject & { milestone: string } => entry.milestone !== null)
    .map((entry) => ({
      entryId: entry.id,
      date: entry.entry_date,
      daysAgo: daysBetween(entry.entry_date, todayISO),
      milestone: entry.milestone,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.entryId.localeCompare(b.entryId));
}
