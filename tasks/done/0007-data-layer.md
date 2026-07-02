# 0007 — Data layer: rollups, throwbacks, queries, write path (A1 + A2)

- **Status:** done
- **Completed:** 2026-07-02
- **Owner:** agent (feat/v1-build run)
- **Created:** 2026-07-02
- **Related:** `tasks/PLAN.md` (A1, A2), PRD §3, ADR-0001, ADR-0004, ADR-0007

## Goal

Every read rollup and the shared write path implemented behind the task-0006 contracts:
timezone-aware date helpers, heatmap/calendar/monthly rollups, Throwback ages + date-seeded
stable pick, streaks, thin RLS fetches, `upsertEntry` (rpc log_entry), project resolution and
palette-color creation with case-insensitive dedupe. "Done" = unit tests for every pure module
pass, plus DB-integration coverage where behavior lives in SQL.

## Plan / checklist

- [x] `lib/dates.ts` — today-in-timezone (ADR-0004), ISO date math, month bounds
- [x] `lib/palette.ts` — project color palette + least-used auto-assign (glossary: color never null)
- [x] `lib/rollups.ts` — heatmap cells + intensity bucketing, calendar day/project cards,
      monthly stats, per-project month splits, rolling trend, weekday pattern
- [x] `lib/throwbacks.ts` — humanized age labels, date-seeded deterministic pick (page top-3 /
      digest top-1 from the same order)
- [x] `lib/streaks.ts` — current/longest streak over logged days (overall + per-project)
- [x] `lib/queries.ts` — thin supabase-js fetches (active projects, entries in range, day
      entries, throwback pool, user timezone)
- [x] `lib/entries.ts` — `upsertEntry` via `rpc("log_entry")`
- [x] `lib/projects.ts` — `resolveProject` (exact case-insensitive, never guesses),
      `findNearMatches`, `createProject` dedupe + palette assign
- [x] Unit tests for all pure modules; keep DB suite green
- [x] Verification (below)

## Verification

2026-07-02 — `npm run test`: **6 files, 56 tests, all passed** (11 DB-integration against
embedded Postgres + 45 unit). `npm run typecheck` and `npm run lint` exit 0. Key behaviors under
test: timezone "today" against known instants; seeded pick stable for same date and different
across dates; age labels at unit boundaries; streak edges (today unlogged, gaps); resolution
requires exactly one case-insensitive match; palette assign avoids reuse until exhausted.

## Outcome

Nine lib modules shipped: `dates` (timezone-day resolution per ADR-0004, DST-safe ISO math),
`palette` (least-used auto-assign, color never null), `rollups` (heatmap cells + 5-level
intensity bucketing, weight-ordered calendar cards, monthly stats, project splits/shares,
7-day rolling trend, weekday pattern), `throwbacks` (nicest-unit age labels, FNV-1a +
mulberry32 date-seeded shuffle, page top-3 / digest top-1 from one ordering), `streaks`
(current/longest + two-window momentum), `queries` (thin RLS fetches incl. throwback pool with
precomputed ages), `entries` (`upsertEntry` -> rpc log_entry), `projects` (exact-only
resolution with near-match hints, dedupe/un-archive create, archive helper).
