# 0006 — Contracts: DB types + domain types + lib signatures

- **Status:** done
- **Completed:** 2026-07-02
- **Owner:** agent (feat/v1-build run)
- **Created:** 2026-07-02
- **Related:** `tasks/PLAN.md` (F3 + C1), ADR-0001, ADR-0006, ADR-0007

## Goal

The typed seam every later stream builds against: `lib/database.types.ts` (schema types in the
supabase-gen format), `lib/types.ts` (domain vocabulary from CONTEXT.md), and the `lib/*.ts`
module signatures (`queries`, `rollups`, `entries`, `projects`). "Done" = `npm run typecheck`
passes with every signature in place.

Naming note: PLAN.md's C1 sketch predates the glossary; `AnniversaryItem`/`getAnniversaries`
ship as `ThrowbackItem`/`getThrowbacks` per CONTEXT.md ("avoid: anniversary").

## Plan / checklist

- [x] `lib/database.types.ts` — hand-written in the generated format (CLI typegen cannot run
      here, ADR-0006 environment; regeneration path documented in RUNBOOK)
- [x] `lib/types.ts` — `TimeSize`, `TIME_WEIGHT`, `Project`, `Entry`, `HeatmapCell`,
      `CalendarDayProject`, `ThrowbackItem`, `MonthlyStat`, `ProjectMonthSplit`
- [x] ADR-0007 — rollups in pure TS over thin fetches, not SQL views
- [x] Verification (below)

## Verification

2026-07-02: `npm run typecheck` (tsc --noEmit) and `npm run lint` (eslint .) both exit 0 with all
contract modules present. The CLI typegen path was attempted first (`supabase gen types
--db-url` against the embedded Postgres) and fails in this environment — its bundled pg-meta
cannot query the local server — so the types are hand-maintained in the identical format, with
the enum labels/order pinned to the real DB by `tests/db/foundation.test.ts`.

## Outcome

`lib/database.types.ts` (supabase-gen format: 3 tables, log_entry function, time_size enum,
helper generics) and `lib/types.ts` (glossary-named domain types + TIME_WEIGHT/TIME_SIZES/
TIME_LABEL). ADR-0007 pins the architectural seam: thin RLS fetches, pure-TS rollups, log_entry
as the only SQL logic. PLAN.md's `AnniversaryItem`/`getAnniversaries` names ship as
`ThrowbackItem`/`getThrowbacks` per the glossary.
