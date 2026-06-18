# 0004 — Foundation: schema + migrations + RLS + seed

- **Status:** todo
- **Owner:** unassigned
- **Created:** 2026-06-17
- **Related:** PRD §2, §7.1, ADR-0001, `tasks/PLAN.md` (F2)

## Goal

The Supabase schema exists and is enforced: `time_size` enum, `projects` + `entries` tables, the
one-per-day unique constraint, indexes, RLS, and 5 seeded starter projects. "Done" = migrations
apply clean, RLS isolates users, and the unique constraint rejects a duplicate `(user, project,
date)`.

## Plan / checklist

- [ ] `time_size` enum in **ascending** order `small,medium,large` (ADR-0001 depends on this)
- [ ] `projects` + `entries` tables per PRD §2 DDL
- [ ] `unique (user_id, project_id, entry_date)` on `entries`
- [ ] Indexes: `entries (user_id, entry_date desc)`, `(project_id)`, partial milestone index
- [ ] RLS policies (`auth.uid() = user_id`) on both tables
- [ ] `supabase/seed.sql` — 5 active starter projects
- [ ] Verification (below)

## Verification

`supabase db reset` applies migrations + seed with no error; a `select` as a second user returns 0
rows (RLS); inserting a duplicate `(user_id, project_id, entry_date)` raises a unique violation;
seed yields exactly 5 active projects. Paste outputs here.

## Outcome

(Filled on completion.)
