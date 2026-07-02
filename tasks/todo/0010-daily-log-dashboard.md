# 0010 — Daily log dashboard: heatmap, calendar, day detail (B2)

- **Status:** in progress
- **Owner:** agent fork (feat/v1-build run)
- **Created:** 2026-07-02
- **Related:** PRD §3.1, §7.3, ADR-0005, ADR-0007, `tasks/PLAN.md` (B2), task-0009

## Goal

The daily log's two complete views over the same Entries — a trailing-year SVG heatmap (overall
effort) and a Notion-quiet month calendar (per-project cards) — switchable but both first-class
(ADR-0005), sharing one day-selection model (`?day=`) that opens a day detail panel hosting the
existing quick add. Nav shell for the whole (log) group. "Done" = component tests for all three
pieces pass and the full gate is green.

## Plan / checklist

- [ ] `app/(log)/layout.tsx` — nav shell (Log / Monthly / Projects / Settings, active link,
      sign-out), max-width container; delete placeholder `app/page.tsx`
- [ ] `app/(log)/page.tsx` — server component: `?view=` toggle, `?month=`, `?day=`; fetches via
      lib/queries with the stored timezone (ADR-0004); side column hosts Log-today quick add +
      the `data-slot="throwback-feed"` placeholder for the lead
- [ ] `components/heatmap/**` — grid builder (pure) + SVG year heatmap: Sunday-first week
      columns, month labels, Mon/Wed/Fri gutter, 5-step accent scale, tooltips, keyboard-
      operable cell selection, legend, overflow-x scroll
- [ ] `components/calendar/**` — month grid: weekday header, muted adjacent-month days, today
      marker, prev/today/next controls, weight-ordered project cards (color bar, S/M/L letter,
      milestone marker), cap 3 + "+N more", responsive min-width scroll
- [ ] `components/day-detail/**` — entry list (project chip, Time Commitment, milestone star,
      description disclosure, delete with confirm) + date-bound quick add + close control
- [ ] `app/(log)/loading.tsx` — skeleton
- [ ] Component tests: heatmap levels/tooltips/selection, calendar grid/order/overflow/today,
      day-detail list/delete/star
- [ ] Verification (below)

## Verification

`npm run test && npm run typecheck && npm run lint && npm run build` all exit 0 in the worktree;
paste summaries.

## Outcome

(Filled on completion.)
