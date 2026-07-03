# 0016 — Public read-only "now" page (stretch)

- **Status:** done
- **Owner:** agent (now-page fork, feat/v1-build run)
- **Created:** 2026-07-03
- **Related:** PRD §8 (stretch: public "now" page), PRD §7 phase 8, ADR-0009, ADR-0004

## Goal

A public, unauthenticated `/now` page — embeddable in the portfolio — that answers "what is
Aidan working on right now?" from the log itself: recent Milestones and large-Time-Commitment
Entries (last 60 days) grouped by Project, most recent first. Read-only, quiet, publishes only
deliberately chosen fields (never Descriptions), and costs nothing to serve (ISR).

## Plan / checklist

- [x] ADR-0009: service-role read scoped to `OWNER_USER_ID`, explicit publication field list,
      ISR caching — the privacy boundary of the one public surface
- [x] `lib/now.ts` — pure `prepareNowItems`: 60-day window, Milestone-or-Large filter,
      group by Project, newest activity first, capped newest-first Milestones per Project,
      deep-work-day counts
- [x] `app/now/page.tsx` — public route outside `(log)`: admin-client fetch of only the
      published fields, `revalidate = 3600`, metadata, space-aesthetic quiet layout,
      graceful empty state (no `OWNER_USER_ID` / no recent items → "quiet lately", never
      an error)
- [x] Middleware: confirmed `/now` is public — already in `isPublicPath`, pinned by
      `tests/lib/middleware.test.ts` (`/now` public, `/nowhere` private); no change needed
- [x] Tests: unit for `prepareNowItems` (window, grouping, ordering, caps, empty);
      component test for the page (mocked admin client + env: renders projects,
      milestones, ages; renders empty state unset-env and no-data)
- [x] Verification (below)

## Verification

Full gate in the `now-page` worktree (2026-07-03), all exit 0:

```
npm run typecheck   → tsc --noEmit, exit 0
npm run lint        → eslint ., exit 0
npm run test        → Test Files  24 passed (24) / Tests  183 passed (183)
npm run build       → ○ /now   141 B   102 kB   Revalidate 1h, Expire 1y
```

`/now` is prerendered static with hourly revalidation (not force-dynamic), exactly the
ADR-0009 caching decision. Publication-list privacy is pinned by test: the entries select
string must contain `milestone` and must NOT contain `description`
(`tests/components/now-page.test.tsx`). New unit coverage: `tests/lib/now.test.ts`
(window filter, case-insensitive grouping, freshest-first ordering, milestone cap 3
newest-first, tie-breaks, empty input).

## Outcome

Public `/now` page shipped (commit `9275902`; ADR-0009 in `6b4391f`): recent Milestones
and deep-work days from the last 60 days, grouped per Project with entity color dot,
category, "active N days ago" age (reusing `humanizeAge`), newest-first milestone list
(capped at 3) and a deep-work-day count. Reads via the service-role admin client scoped
to `OWNER_USER_ID` with an explicit publication field list — Descriptions are never
fetched. ISR hourly; graceful "Building quietly" empty state when env or data is absent,
so the page can never error publicly. Middleware already treated `/now` as public.
