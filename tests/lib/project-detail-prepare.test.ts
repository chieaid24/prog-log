import { describe, expect, it } from "vitest";
import {
  buildCommitmentSplit,
  buildProjectMilestones,
} from "@/components/projects/detail-prepare";
import { TIME_RAMP } from "@/components/monthly/prepare";
import type { EntryWithProject } from "@/lib/types";

function entry(
  id: string,
  date: string,
  time: EntryWithProject["time_spent"],
  milestone: string | null = null,
): EntryWithProject {
  return {
    id,
    user_id: "u1",
    project_id: "p1",
    entry_date: date,
    time_spent: time,
    milestone,
    description: null,
    created_at: `${date}T12:00:00Z`,
    project: {
      id: "p1",
      name: "AI-M",
      color: "#339797",
      category: "Work",
      status: "active",
    },
  };
}

describe("buildCommitmentSplit", () => {
  it("counts every size and assigns the shared heat ramp", () => {
    expect(
      buildCommitmentSplit([
        entry("e1", "2026-08-01", "small"),
        entry("e2", "2026-08-02", "medium"),
        entry("e3", "2026-08-03", "medium"),
        entry("e4", "2026-08-04", "large"),
      ]),
    ).toEqual([
      { size: "small", name: "Small", color: TIME_RAMP.small, count: 1, pct: 25 },
      { size: "medium", name: "Medium", color: TIME_RAMP.medium, count: 2, pct: 50 },
      { size: "large", name: "Large", color: TIME_RAMP.large, count: 1, pct: 25 },
    ]);
  });

  it("keeps zero buckets visible and gives a single size 100 percent", () => {
    expect(buildCommitmentSplit([entry("e1", "2026-08-01", "large")])).toEqual([
      { size: "small", name: "Small", color: TIME_RAMP.small, count: 0, pct: 0 },
      { size: "medium", name: "Medium", color: TIME_RAMP.medium, count: 0, pct: 0 },
      { size: "large", name: "Large", color: TIME_RAMP.large, count: 1, pct: 100 },
    ]);
  });

  it("returns no chart segments without Entries", () => {
    expect(buildCommitmentSplit([])).toEqual([]);
  });
});

describe("buildProjectMilestones", () => {
  it("filters plain Entries, computes age, and sorts chronologically", () => {
    const entries = [
      entry("e3", "2026-08-03", "small", "third"),
      entry("e2", "2026-08-02", "medium", null),
      entry("e1", "2026-08-01", "large", "first"),
    ];

    expect(buildProjectMilestones(entries, "2026-08-04")).toEqual([
      { entryId: "e1", date: "2026-08-01", daysAgo: 3, milestone: "first" },
      { entryId: "e3", date: "2026-08-03", daysAgo: 1, milestone: "third" },
    ]);
    expect(entries.map((item) => item.id)).toEqual(["e3", "e2", "e1"]);
  });
});
