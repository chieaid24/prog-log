# 0018 — Streaks + per-project momentum on the dashboard (stretch)

- **Status:** done
- **Owner:** agent (feat/v1-build run, lead)
- **Created:** 2026-07-03
- **Related:** PRD §8 (stretch: streaks + momentum), PRD §9 (open question: separate
  streak view?), ADR-0011, `lib/streaks.ts` (math shipped in task 0007)

## Goal

Surface the already-computed streak and momentum math in the UI: a dashboard Momentum
card showing the global logging streak (current / longest / total days) and per-project
cadence (rising / steady / cooling over two 14-day windows) with per-project current
streaks — giving learning projects (Turkish, Mandarin) their daily-practice visibility
without a separate view. Resolves the PRD §9 open question; decision recorded as
ADR-0011.

## Plan / checklist

- [x] ADR-0011: no separate streak view — streaks integrate into the dashboard
- [x] `lib/queries.ts` — `getEntryDatesWithProject` (lean all-time select: entry_date,
      project_id; streaks need full history, not the heatmap's year window)
- [x] `components/streak/prepare.ts` — pure: global `StreakSummary` + per-project rows
      (momentum direction, days-in-last-14, per-project current streak), active projects
      only, 28-day activity window, stable ordering
- [x] `components/streak/momentum-panel.tsx` — dashboard aside card: streak header,
      per-project rows with direction glyphs (▲ rising / ─ steady / ▼ cooling), "Nd run"
      marker for runs ≥ 2, empty state for a fresh account
- [x] Wire into `app/(log)/page.tsx` aside (below Throwbacks)
- [x] Tests: unit for prepare (fixed dates; window edges; archived excluded; ordering),
      component test for the panel (streak text, direction glyphs, empty state)
- [x] Verification (below)

## Verification

Full gate on `feat/v1-build` (2026-07-03):

```
npm run typecheck   → tsc --noEmit, exit 0
npm run lint        → eslint ., exit 0
npm run test        → Test Files  23 passed (23) / Tests  178 passed (178)
npm run build       → compiled successfully
```

Prepared rows pinned in `tests/components/momentum.test.tsx`: global streak 3 for three
consecutive days; per-project streak + rising direction; cooling for a prev-window-only
project; 28-day window excludes stale projects; archived excluded; yesterday keeps a
streak alive; empty history → no rows + quiet empty state in the rendered panel.

## Outcome

Dashboard aside gained a Momentum card: global logging streak (current / longest /
total days) and one cadence row per recently-active Project — direction over two 14-day
windows plus that Project's own consecutive-day run. Resolves PRD §9's open question per
ADR-0011: learning projects get streak visibility on the same screen as the quick-add
that extends the streak; no separate view, no category special-casing.
