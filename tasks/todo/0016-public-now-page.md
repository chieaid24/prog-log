# 0016 — Public read-only "now" page (stretch)

- **Status:** in progress
- **Owner:** agent (now-page fork, feat/v1-build run)
- **Created:** 2026-07-03
- **Related:** PRD §8 (stretch: public "now" page), PRD §7 phase 8, ADR-0009, ADR-0004

## Goal

A public, unauthenticated `/now` page — embeddable in the portfolio — that answers "what is
Aidan working on right now?" from the log itself: recent Milestones and large-Time-Commitment
Entries (last 60 days) grouped by Project, most recent first. Read-only, quiet, publishes only
deliberately chosen fields (never Descriptions), and costs nothing to serve (ISR).

## Plan / checklist

- [ ] ADR-0009: service-role read scoped to `OWNER_USER_ID`, explicit publication field list,
      ISR caching — the privacy boundary of the one public surface
- [ ] `lib/now.ts` — pure `prepareNowItems`: 60-day window, Milestone-or-Large filter,
      group by Project, newest activity first, capped newest-first Milestones per Project,
      deep-work-day counts
- [ ] `app/now/page.tsx` — public route outside `(log)`: admin-client fetch of only the
      published fields, `revalidate = 3600`, metadata, space-aesthetic quiet layout,
      graceful empty state (no `OWNER_USER_ID` / no recent items → "quiet lately", never
      an error)
- [ ] Middleware: confirm `/now` is public (already in `isPublicPath` + pinned by
      `tests/lib/middleware.test.ts`) — no change expected
- [ ] Tests: unit for `prepareNowItems` (window, grouping, ordering, caps, empty);
      component test for the page (mocked admin client + env: renders projects,
      milestones, ages; renders empty state unset-env and no-data)
- [ ] Verification (below)

## Verification

`npm run typecheck && npm run lint && npm run test && npm run build` all exit 0 in the
worktree; paste summary. `/now` emitted as ISR (revalidate 3600), not force-dynamic.

## Outcome

(Filled on completion.)
