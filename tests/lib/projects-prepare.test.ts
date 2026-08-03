import { describe, expect, it } from "vitest";
import { OTHER_COLOR } from "@/components/monthly/prepare";
import { buildDonutSegments } from "@/components/projects/prepare";
import type { ProjectShare } from "@/lib/rollups";

function share(overrides: Partial<ProjectShare> & { projectName: string }): ProjectShare {
  return {
    projectId: `p-${overrides.projectName}`,
    color: "#bd6254",
    weight: 1,
    share: 1,
    ...overrides,
  };
}

describe("buildDonutSegments", () => {
  it("maps shares to named, colored, integer-percent slices", () => {
    const segments = buildDonutSegments([
      share({ projectName: "AI-M", color: "#339797", weight: 6, share: 0.75 }),
      share({ projectName: "Turkish", color: "#bf5b76", weight: 2, share: 0.25 }),
    ]);
    expect(segments).toEqual([
      { name: "AI-M", color: "#339797", pct: 75, weight: 6 },
      { name: "Turkish", color: "#bf5b76", pct: 25, weight: 2 },
    ]);
  });

  it("keeps a sliver visible at 1 percent minimum", () => {
    const segments = buildDonutSegments([
      share({ projectName: "Big", weight: 400, share: 0.998 }),
      share({ projectName: "Tiny", weight: 1, share: 0.002 }),
    ]);
    expect(segments[1].pct).toBe(1);
  });

  it("omits projects with no logged effort", () => {
    const segments = buildDonutSegments([
      share({ projectName: "Logged", weight: 3, share: 1 }),
      share({ projectName: "Idle", weight: 0, share: 0 }),
    ]);
    expect(segments.map((s) => s.name)).toEqual(["Logged"]);
  });

  it("falls back to the neutral color when a project has none", () => {
    const segments = buildDonutSegments([share({ projectName: "Colorless", color: null })]);
    expect(segments[0].color).toBe(OTHER_COLOR);
  });

  it("returns nothing for no shares", () => {
    expect(buildDonutSegments([])).toEqual([]);
  });
});
