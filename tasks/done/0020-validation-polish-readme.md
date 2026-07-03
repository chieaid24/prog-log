# 0020 — Manual validation, polish pass, README

- **Status:** done
- **Owner:** agent (feat/v1-build run, lead)
- **Created:** 2026-07-03
- **Related:** PRD §7 phase 8 (polish), global engineering standard (pixel-pickiness),
  CLAUDE.md rule 4 (manual/dev-server validation for feature changes), ADR-0012

## Goal

Prove the product works as a product, not as a test suite: run the full stack locally
(supabase local + dev server), exercise every core flow end-to-end (magic-link login,
quick add incl. re-log accumulation, heatmap, calendar + day detail, monthly breakdown,
Throwback feed, Momentum card, projects create/edit/archive, settings timezone,
export/import round-trip, /now signed-out, capture routes via curl), screenshot every
view, fix anything visually or behaviorally off, and give the repo a portfolio-grade
README.

## Plan / checklist

- [x] Local stack: `supabase start`, migrations + seed applied (`supabase db reset`,
      5 migrations clean), dev user seeded, `.env.local` wired, `npm run dev` serving
- [x] Auth flow: magic link round-trip (mailpit), unauth redirect — **found & fixed** a
      real bug: confirm route only handled `token_hash` links; the default GoTrue
      template sends PKCE `?code=` and login bounced to `/login?error=confirm`. Route
      now exchanges the code too (would have broken production). 5 request tests added.
- [x] Quick add: Website logged Large + Milestone via UI, re-logged Small → DB shows
      `large` + milestone retained (ADR-0001 proven end-to-end through the real UI)
- [x] Dashboard: heatmap texture vs 433 fixture entries; **found & fixed** first-column
      month-label collision ("JunJul"); calendar banners + "+2 more"; day detail with
      per-entry delete + date-scoped quick add; view toggle; Throwbacks (loose
      discovery selection confirmed as PRD 3.4 spec); Momentum updated live after log
- [x] Monthly: stat tiles / split / trend / project stack / share / weekday / milestones
      all consistent with fixture; month nav; empty month (2023-05) has clean empties
- [x] Projects: create Rocketry → appears in picker; archive → drops from picker,
      Archived section explains history stays; alias add ("zh") + remove on Mandarin
- [x] Settings: timezone save round-trip (Vancouver → persisted → restored); CSV + JSON
      export 200; JSON import of own export is a **no-op round-trip** (5 projects / 433
      entries before and after)
- [x] /now signed-out renders publication-list-only cards; capture routes via curl:
      discord unsigned → 401, log no/bad bearer → 401, log valid bearer + alias `aim` →
      200 resolved to AI-M and merged into today's entry, digest bad secret → 401
- [x] Screenshots of every view (playwright, `chromium` headless); hydration warning on
      /login triaged: **Playwright screenshot caret-hiding artifact**, zero console
      errors on plain load
- [x] README: hero screenshot, features, stack, dev quickstart incl. fixture script,
      runbook pointer (bulk written earlier in the run; polished here)
- [x] Build hermeticity **found & fixed**: `/now` prerender required a reachable DB —
      now falls back to the quiet state at build time only, rethrows at runtime; 2
      component tests added. Explicit role-grants migration + GoTrue-complete seed user
      committed (ADR-0012)
- [x] Verification (below)

## Verification

- Full gate on the branch: `npm run typecheck && npm run lint && npm run test &&
  npm run build` → all exit 0; **217 tests, 28 files, all passing** (210 before this
  task, +5 auth-confirm, +5 heatmap-grid, +2 now-page fallback, -5 superseded none).
- `supabase db reset`: all 5 migrations + seed apply clean against the local stack.
- Real-DB semantics check after UI re-log:
  `select p.name, e.time_spent, e.milestone from entries e join projects p …
   where entry_date='2026-07-03'` → `Website | large | e2e milestone check` (peak kept,
  milestone never erased).
- Export round-trip: 5 projects / 433 entries before import == after import.
- Capture gates (curl): 401 / 401 / 401 / 200-with-alias-resolution / 401 as listed.
- Screenshots: `01-login … 15-projects-archived` reviewed; two visual defects found
  (month-label collision, /now build failure) — both fixed in this task with tests.

## Outcome

The product was exercised end-to-end as a user would use it, on a real local Supabase
stack, with 433 entries of demo history. Three genuine defects surfaced and were fixed
with regression tests: PKCE magic-link confirm (production-breaking), non-hermetic
`/now` build, heatmap month-label collision. Role grants moved into migrations
(ADR-0012) so the class of "works in CI, dies on a real stack" permission bugs is now
caught by the DB suite. README is portfolio-ready with a live screenshot.
