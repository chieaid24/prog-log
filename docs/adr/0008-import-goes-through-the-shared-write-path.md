# 0008 — Import goes through the shared write path, row by row

- **Status:** accepted
- **Date:** 2026-07-03
- **Related:** PRD §8 (export/import stretch), ADR-0001, task-0015

## Context

The import stretch goal (CSV/JSON, the Notion migration path) has to write potentially
hundreds of Entries at once. The tempting implementation is a bulk `insert ... on conflict`
straight into `entries` — fast, one round trip. But ADR-0001 pins every capture surface to
the single `log_entry` upsert-accumulate path (`time_spent = greatest(old,new)`,
`milestone`/`description` = `coalesce(new,old)`, entry_date frozen in the stored timezone).
A second, bulk write path would duplicate those semantics in a place that drifts silently
when `log_entry` evolves — and a naive upsert would let a re-import *downgrade* a Large day
to Small or null out a Milestone.

Import also references Projects by name, not id: rows may name Projects that don't exist
yet, or name existing ones with different casing.

## Decision

Import is a loop over `upsertEntry` — one `log_entry` RPC per row, with an explicit
`entryDate` — exactly like every other capture surface. Unknown Project names are created
first via `createProject` (which dedups case-insensitively per user and revives archived
matches). Rows that fail validation are reported per line and skipped; valid rows still
land. Nothing is ever deleted or replaced wholesale.

The export format is the import format: a flat CSV (`entry_date,project,time_spent,
milestone,description`) and a versioned JSON envelope (`format: "prog-log-export",
version: 1`) that additionally carries Project metadata (category, color, status) so a
JSON import can restore a full workspace. Both are parsed into the same normalized rows.

## Consequences

- Re-import is safe by construction: accumulate semantics mean importing the same file
  twice is a no-op, and importing an older export can never erase newer Milestones or
  shrink a day's Time Commitment. This is the property that makes import a low-stakes
  button instead of a dangerous one.
- Import speed is bounded by one RPC per row. For this product's scale (one user, a few
  hundred rows from Notion) that is well inside a server action's budget; if it ever
  hurts, batch *inside* `log_entry` (SQL), never beside it (TS).
- Rejected: bulk `insert ... on conflict do update` (duplicates ADR-0001 semantics in a
  second place, and gets them subtly wrong on re-import); rejecting the whole file on the
  first bad row (Notion exports are messy; per-line errors with partial success migrate
  more data with less back-and-forth).
