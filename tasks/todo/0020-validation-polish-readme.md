# 0020 — Manual validation, polish pass, README

- **Status:** in progress
- **Owner:** agent (feat/v1-build run, lead)
- **Created:** 2026-07-03
- **Related:** PRD §7 phase 8 (polish), global engineering standard (pixel-pickiness),
  CLAUDE.md rule 4 (manual/dev-server validation for feature changes)

## Goal

Prove the product works as a product, not as a test suite: run the full stack locally
(supabase local + dev server), exercise every core flow end-to-end (magic-link login,
quick add incl. re-log accumulation, heatmap, calendar + day detail, monthly breakdown,
Throwback feed, Momentum card, projects create/edit/archive, settings timezone,
export/import round-trip, /now signed-out, capture routes via curl), screenshot every
view, fix anything visually or behaviorally off, and give the repo a portfolio-grade
README.

## Plan / checklist

- [ ] Local stack: `supabase start`, migrations + seed applied, test user created,
      `.env.local` wired, `npm run dev` serving
- [ ] Auth flow: magic link round-trip (inbucket), unauth redirect
- [ ] Quick add: create Entry; re-log same day with smaller size → peak retained;
      milestone never erased (web upsert path, real DB)
- [ ] Dashboard: heatmap colors vs seeded weights; calendar banners; day detail; view
      toggle; Throwbacks; Momentum
- [ ] Monthly: stats + charts vs seeded data; month nav; empty month
- [ ] Projects: create, edit, archive → drops from picker, history intact
- [ ] Settings: timezone save; CSV + JSON export download; import round-trip
- [ ] /now signed-out; capture routes via curl (discord 401 unsigned, log 401 bad
      bearer + 200 valid, digest 401 bad secret)
- [ ] Screenshots of every view (playwright); fix anything off (list fixes here)
- [ ] README.md: what/why, features, stack, architecture map, dev quickstart,
      runbook pointer
- [ ] Verification (below)

## Verification

Screenshots captured for every view; each flow's observed behavior recorded here; any
defect found is fixed in this task with a regression test where applicable; full gate
green at close.

## Outcome

(Filled on completion.)
