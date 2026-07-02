# 0011 — Monthly breakdown + visual explorations + Throwback feed (B3 + B4)

- **Status:** in progress
- **Owner:** agent fork (feat/v1-build run, worktree)
- **Created:** 2026-07-02
- **Related:** PRD §3.3, §3.3.1, §3.4, ADR-0005, ADR-0007, `tasks/PLAN.md` (B3, B4)

## Goal

"How did I spend my month?" answered on `/monthly`: stat tiles (days worked, entries,
milestones, large sessions), the month's Time Commitment split, the required per-project
stacked bar, at least two additional real-data visualizations (effort trend, weekday
pattern) plus a project-share bar, and the month's Milestones list — every chart modular,
empty/sparse/dense-safe, hover-detailed, accessible. Plus the self-contained
`<ThrowbackFeed/>` server component (PRD §3.4): date-seeded stable top-3 with humanized
ages and a quiet empty state.

## Plan / checklist

- [ ] Validate chart palettes with the dataviz validator (ordinal S/M/L ramp on dark
      surface; project palette adjacency) and record results + mitigations here
- [ ] Pure data-prep helpers (`components/monthly/prepare.ts`) + unit tests
- [ ] Stat tiles + Time Commitment split (ordinal ramp, no chart-junk)
- [ ] Per-project stacked bar (Recharts, horizontal; S/M/L ordinal shades; project rows
      labeled by name with entity color dot; 2px surface gaps; tooltip with exact counts)
- [ ] Effort trend (90 days ending today; faint daily bars + 2px rolling-average line;
      answers "is my effort rising or falling?")
- [ ] Weekday pattern (displayed month; answers "which days do I actually work?")
- [ ] Project share bar (month; answers "where did the month's effort go?"; entity
      colors, direct labels, top-6 + Other fold)
- [ ] Milestones list for the month (date + project chip + Milestone text)
- [ ] `/monthly` page: ?month=YYYY-MM param, prev/next/this-month nav, one fetch,
      timezone-correct default month, empty states
- [ ] `<ThrowbackFeed/>`: stable pick via lib/throwbacks, age labels, project chips,
      quiet empty state; component tests
- [ ] Component tests (mock @/lib/queries + @/lib/supabase/server; fixed dates only)
- [ ] Verification (below)

## Verification

`npm run test && npm run typecheck && npm run lint && npm run build` all exit 0 in the
worktree; summaries pasted here. Chart correctness pinned by unit tests on the prepared
series (not SVG internals); feed stability pinned against `pickThrowbacks` for a fixed
date.

## Outcome

(Filled on completion.)
