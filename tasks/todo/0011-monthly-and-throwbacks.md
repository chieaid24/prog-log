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

- [x] Validate chart palettes with the dataviz validator (ordinal S/M/L ramp on dark
      surface; project palette adjacency) and record results + mitigations here
- [x] Pure data-prep helpers (`components/monthly/prepare.ts`) + unit tests
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

## Palette validation (dataviz validator, dark mode, surface `#070a13`)

**Time Commitment ordinal ramp** `#454e7d / #7c8cf8 / #b3bdfc` (S/M/L) —
`validate_palette.js --ordinal --mode dark --surface "#070a13"`:

```
[PASS] Lightness monotone     steps read light→dark
[PASS] Adjacent ΔL            all gaps >= 0.06
[PASS] Light-end contrast     #454e7d at 2.49:1 vs surface
[PASS] Single hue             hue spread 3°
→ ALL CHECKS PASS
```

**Project entity palette** (`lib/palette.ts`, 10 colors) — categorical run:

```
[FAIL] Lightness band         all 10 above the dark band [0.48, 0.67]
[PASS] Chroma floor           all 10 >= 0.1
[FAIL] CVD separation         worst adjacent #c084fc↔#7c8cf8 ΔE 1.3 (protan)
[PASS] Contrast vs surface    all 10 >= 3:1
```

Assessment + mitigations (the entity palette is a committed cross-view contract
from task 0006; it is not a chart series palette, so it is not re-picked here):

- Lightness band: intentionally bright accents for the near-black space surface
  (`#070a13` is far darker than the validator's default dark surface); every color
  clears 3:1 contrast, which is the check that matters on this canvas.
- CVD adjacency (indigo vs violet under protan): in every monthly chart identity is
  **never color-alone** — the stacked bar labels each row by Project name (color is
  only a dot beside the label) and fills segments with the validated S/M/L ramp; the
  share bar direct-labels every segment (name + percent) and separates fills with
  2px surface gaps; Milestone/Throwback chips carry the name in text. Direct labels
  + gaps are exactly the validator's sanctioned secondary encoding.
- Palette *order* is not chart adjacency anyway: color follows the entity, and chart
  neighbors depend on which Projects rank next to each other in a given month.

## Verification

`npm run test && npm run typecheck && npm run lint && npm run build` all exit 0 in the
worktree; summaries pasted here. Chart correctness pinned by unit tests on the prepared
series (not SVG internals); feed stability pinned against `pickThrowbacks` for a fixed
date.

## Outcome

(Filled on completion.)
