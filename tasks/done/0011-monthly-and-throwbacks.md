# 0011 — Monthly breakdown + visual explorations + Throwback feed (B3 + B4)

- **Status:** done
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
- [x] Stat tiles + Time Commitment split (ordinal ramp, no chart-junk)
- [x] Per-project stacked bar (Recharts, horizontal; S/M/L ordinal shades; project rows
      labeled by name with entity color dot; 2px surface gaps; tooltip with exact counts)
- [x] Effort trend (90 days ending today; faint daily bars + 2px rolling-average line;
      answers "is my effort rising or falling?")
- [x] Weekday pattern (displayed month; answers "which days do I actually work?")
- [x] Project share bar (month; answers "where did the month's effort go?"; entity
      colors, direct labels, top-6 + Other fold)
- [x] Milestones list for the month (date + project chip + Milestone text)
- [x] `/monthly` page: ?month=YYYY-MM param, prev/next/this-month nav, one fetch,
      timezone-correct default month, empty states
- [x] `<ThrowbackFeed/>`: stable pick via lib/throwbacks, age labels, project chips,
      quiet empty state; component tests
- [x] Component tests (mock @/lib/queries + @/lib/supabase/server; fixed dates only)
- [x] Verification (below)

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

Full gate in the worktree (2026-07-03), all exit 0:

```
npm run typecheck   → tsc --noEmit, clean
npm run lint        → eslint ., clean
npm run test        → Test Files  12 passed (12) / Tests  108 passed (108)
npm run build       → compiled; └ ƒ /monthly  111 kB  214 kB
```

Chart correctness pinned by unit tests on the prepared series
(`tests/lib/monthly-prepare.test.ts`, 24 tests — never SVG internals) plus component
tests (`tests/components/monthly.test.tsx`, 12 tests): stat tiles + split numbers,
stacked bar mirrored in the accessible table, share segments direct-labeled, only the
peak weekday labeled, trend bars = logged days with latest rolling average, milestone
rows in order, and the page test proving one union-range fetch
(`getEntriesInRange({}, "2026-03-23", "2026-06-20")` for May + 90-day trend), the
month param honored, and the timezone-correct default month with quiet empty states.
Feed stability pinned against `pickThrowbacks` for a fixed date
(`tests/components/throwback-feed.test.tsx`, 3 tests): rendered top-3 equals the
library pick in order (the digest contract), stable across re-renders, quiet empty
state.

## Outcome

`/monthly` answers "how did I spend my month?" with stat tiles + Time Commitment split
meter, the per-project stacked bar (Recharts, identity in row labels with entity color
dots, validated S/M/L ordinal ramp fills, 1px surface strokes), a 90-day effort trend
(custom SVG: faint daily bars + 2px trailing 7-day average line), the weekday pattern
(peak selectively labeled), the project share bar (entity colors, direct labels, top-6
+ Other fold) and the month's Milestones list — every chart modular under
`components/monthly/`, prepared by pure helpers in `prepare.ts`, empty/sparse/dense
safe, with sr-only tables/labels for screen readers. `<ThrowbackFeed/>`
(`components/throwback/throwback-feed.tsx`) is a self-contained server component the
dashboard slots into its `data-slot="throwback-feed"` placeholder: date-seeded stable
top-3 with humanized ages and project chips. Commits `c838119`, `fc09c64`, `1a1bc3d`.
