# 0009 — Quick add: form, server actions, explicit-date write path (B1)

- **Status:** done
- **Completed:** 2026-07-02
- **Owner:** agent (feat/v1-build run)
- **Created:** 2026-07-02
- **Related:** `tasks/PLAN.md` (B1), PRD §3.2, §3.1.2, ADR-0001, ADR-0004

## Goal

The common case is trivial: pick Project, pick Time Commitment, done. Milestone is one optional
line; Description hides behind "+ add detail". The picker exposes "+ New project" inline (create,
auto-select, continue). Server actions call the shared `upsertEntry` path. Gap discovered against
the PRD: §3.1.2 lets the calendar open quick add **for a clicked past date**, but `log_entry`
always stamps "today" — extend it with an optional explicit date (capture paths unchanged).

## Plan / checklist

- [x] Migration 3: `log_entry` gains `p_date date default null` (drop + recreate — no overload
      ambiguity for PostgREST rpc); DB tests for explicit-date logging + accumulate-on-conflict
- [x] `lib/database.types.ts` + `lib/entries.ts` accept optional `entryDate`
- [x] `app/actions/entries.ts` (`logEntryAction`), `app/actions/projects.ts`
      (`createProjectAction`) with input validation + `revalidatePath`
- [x] `components/quick-add/quick-add-form.tsx` — active-only picker, inline "+ New project"
      mini-form, S/M/L segmented control, optional Milestone line, Description behind
      "+ add detail", pending/success/error states
- [x] Component tests: log flow args, inline-create auto-select, description stays hidden until
      revealed
- [x] Verification (below)

## Verification

2026-07-02 — `npm run test`: **9 files, 69 tests passed** (2 new DB tests: explicit-date logging
lands on the supplied day and accumulates into the existing row; 6 quick-add component tests:
common-case args, clicked-date pass-through, milestone + hidden-description reveal, inline
create-and-select flow, submit disabled until both picks, server-error surface). `typecheck` and
`lint` exit 0.

## Outcome

Quick add ships as `components/quick-add/quick-add-form.tsx` + `logEntryAction` /
`createProjectAction` server actions (validated input, revalidatePath, structured results).
Migration 3 recreates `log_entry` with `p_date date default null` (drop + recreate — PostgREST
cannot dispatch overloads); capture paths keep the today-in-timezone default. Also shipped
`deleteEntryAction` and `setProjectStatusAction`/`updateProjectAction` for the day-detail and
projects views to consume. Vitest `globals` enabled for testing-library auto-cleanup.
