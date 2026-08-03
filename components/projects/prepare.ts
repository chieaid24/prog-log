// Pure data-prep for the Projects overview charts (same pattern as
// components/monthly/prepare.ts): components stay thin, behavior unit-tests
// without touching SVG internals.
import { OTHER_COLOR } from "@/components/monthly/prepare";
import type { ProjectShare } from "@/lib/rollups";

export type DonutSegment = {
  name: string;
  color: string;
  /** Integer percent, >= 1 for any nonzero share so a sliver stays visible. */
  pct: number;
  weight: number;
};

/**
 * Donut slices: one per Project with logged effort, heaviest first. Projects
 * with no Entries are omitted (a zero-weight slice has no area to draw).
 */
export function buildDonutSegments(shares: readonly ProjectShare[]): DonutSegment[] {
  return shares
    .filter((s) => s.weight > 0)
    .map((s) => ({
      name: s.projectName,
      color: s.color ?? OTHER_COLOR,
      pct: Math.max(1, Math.round(s.share * 100)),
      weight: s.weight,
    }));
}
