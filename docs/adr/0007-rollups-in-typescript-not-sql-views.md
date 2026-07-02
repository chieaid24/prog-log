# 0007 — Rollups computed in TypeScript lib functions, not SQL views

- **Status:** accepted
- **Date:** 2026-07-02
- **Related:** PRD §3 (features & queries); ADR-0006; task-0006

## Context

PRD §3 sketches each feature's data need as a SQL aggregate (heatmap weights, per-day/per-project
calendar rollup, monthly stats, the Throwback pool). Those could ship as Postgres views/RPCs, or
as plain row fetches aggregated in TypeScript. Two environment facts weigh in: Supabase views
default to owner (security-definer-like) semantics and silently bypass RLS unless
`security_invoker` is remembered on every view; and the automated test rig (ADR-0006) has real
Postgres but no PostgREST, so SQL-side logic can only be integration-tested, while pure TS
functions can be unit-tested anywhere.

## Decision

The data layer fetches rows through thin supabase-js selects (filters and joins only — the things
PostgREST does natively under RLS) and computes every rollup in pure TypeScript functions in
`lib/rollups.ts` and friends: heatmap cells and intensity bucketing, calendar day/project cards,
monthly stats, Throwback ages and the seeded daily pick, streaks. The one exception stays SQL:
`log_entry` (ADR-0001), because its upsert-accumulate must be atomic and shared by every capture
path.

## Consequences

- A year of single-user data is a few hundred rows; shipping them to the server component and
  folding in TS is microseconds — scale is a non-issue at this design point.
- Rollup logic is deterministic, pure, and unit-tested with fixture rows; the fetch layer is thin
  enough that integration risk concentrates in RLS + schema, which the DB suite already covers.
- No view can silently bypass RLS, because there are no views.
- If multi-user or multi-year scale ever matters, individual rollups can move into SQL behind the
  same function signatures — the seam is the `lib/` contract, not the transport.
- The PRD's SQL sketches remain documentation of intent, not shipped objects.
