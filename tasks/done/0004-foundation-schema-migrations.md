# 0004 — Foundation: schema + migrations + RLS + seed

- **Status:** done
- **Owner:** agent (feat/v1-build run)
- **Created:** 2026-06-17
- **Completed:** 2026-07-02
- **Related:** PRD §2, §7.1, ADR-0001, ADR-0004, ADR-0006, `tasks/PLAN.md` (F2)

## Goal

The Supabase schema exists and is enforced: `time_size` enum, `projects` + `entries` tables, the
one-per-day unique constraint, indexes, RLS, and 5 seeded starter projects. "Done" = migrations
apply clean, RLS isolates users, and the unique constraint rejects a duplicate `(user, project,
date)`.

## Plan / checklist

- [x] `time_size` enum in **ascending** order `small,medium,large` (ADR-0001 depends on this)
- [x] `projects` + `entries` tables per PRD §2 DDL
- [x] `unique (user_id, project_id, entry_date)` on `entries`
- [x] Indexes: `entries (user_id, entry_date desc)`, `(project_id)`, partial milestone index
- [x] RLS policies (`auth.uid() = user_id`) on both tables
- [x] `app_settings` + `log_entry` shared write path (PRD §2, ADR-0001/0004) — second migration
- [x] `supabase/seed.sql` — 5 active starter projects
- [x] Verification (below)

## Verification

Environment note: Docker/WSL integration is unavailable here, so verification runs against a real
embedded Postgres 17 applying the identical migrations + seed (ADR-0006); the `supabase/` layout
stays CLI-compatible for `supabase db reset` later.

`npm run test` (2026-07-02):

```
 Test Files  1 passed (1)
      Tests  11 passed (11)
   Duration  1.20s
```

Covered by `tests/db/foundation.test.ts`, all passing:
- migrations apply clean; tables exist; `time_size` enum order is exactly small→medium→large
- seed yields exactly 5 active projects with non-null colors
- duplicate `(user_id, project_id, entry_date)` insert raises `23505` unique_violation
- RLS: second user sees 0 of first user's projects/entries; authenticated caller passing another
  user's id to `log_entry` is rejected with `42501`
- `log_entry` accumulate: peak `time_spent` survives lower re-log; upgrades on higher re-log;
  bare re-log never nulls existing milestone/description; repeated logs keep exactly 1 row
- ADR-0004: `entry_date` equals today in the stored timezone (`Pacific/Kiritimati` differs from
  UTC most of the day); missing settings row falls back to `America/Toronto`

## Outcome

Two migrations in `supabase/migrations/` (init: enum/tables/indexes/RLS; settings + `log_entry`),
`supabase/seed.sql` with the 5 PRD starter projects, `supabase/config.toml` (PG 17). One
deliberate hardening beyond the PRD sketch: `log_entry` coalesces a missing `app_settings` row to
the default `America/Toronto` instead of erroring with a null `entry_date`. Test harness
(`tests/db/`) boots embedded Postgres 17 with a Supabase auth shim per run — see ADR-0006.
