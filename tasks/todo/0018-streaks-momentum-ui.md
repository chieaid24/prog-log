# 0018 — Streaks + per-project momentum on the dashboard (stretch)

- **Status:** in progress
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

- [ ] ADR-0011: no separate streak view — streaks integrate into the dashboard
- [ ] `lib/queries.ts` — `getEntryDatesWithProject` (lean all-time select: entry_date,
      project_id; streaks need full history, not the heatmap's year window)
- [ ] `components/streak/prepare.ts` — pure: global `StreakSummary` + per-project rows
      (momentum direction, days-in-last-14, per-project current streak), active projects
      only, quiet-project fold, stable ordering
- [ ] `components/streak/momentum-panel.tsx` — dashboard aside card: streak header,
      per-project rows with direction glyphs (▲ rising / ─ steady / ▼ cooling), streak
      flame for runs ≥ 2, empty state for a fresh account
- [ ] Wire into `app/(log)/page.tsx` aside (below Throwbacks)
- [ ] Tests: unit for prepare (fixed dates; window edges; archived excluded; ordering),
      component test for the panel (streak text, direction glyphs, empty state)
- [ ] Verification (below)

## Verification

`npm run typecheck && npm run lint && npm run test && npm run build` all exit 0; paste
summary. Prepared rows pinned by unit tests against `computeStreaks`/`computeMomentum`
for fixed dates.

## Outcome

(Filled on completion.)
