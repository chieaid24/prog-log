# 0001 — Entry grain is one-per-(project, day), upsert-accumulate

- **Status:** accepted
- **Date:** 2026-06-17
- **Related:** PRD §2 (data model), §3.1 (calendar/heatmap), §4 (capture)

## Context

The core unit is "a project worked on a day, at a rough time commitment." The PRD
prose said "one row per project per day," but the schema carried no unique
constraint and the capture sketch did plain inserts — so re-logging the same
project/day would create duplicate rows and double-count weight. The Entry grain had
to be pinned down before any capture path was built.

## Decision

An Entry represents how much a Project was worked on a given day, not an individual
session. We enforce `unique (user_id, project_id, entry_date)` and have every capture
path (web quick-add, Discord `/log`, Apple Shortcut) upsert rather than insert,
through a shared `log_entry` function. On conflict the row accumulates: `time_spent`
takes the `greatest()` of old and new, and `milestone`/`description` are
`coalesce`-merged, so a quick re-log can never silently downgrade effort or erase a
milestone.

## Consequences

- Chosen over append-only "sessions": the product question is "which projects did I
  touch today, and how hard," not "how many separate blocks." The calendar's
  one-banner-per-project and the heatmap's per-day weight fall out naturally.
- `greatest()` on `time_spent` relies on the `time_size` enum being declared in
  ascending-effort order (`small, medium, large`); reordering it silently breaks max.
- Two genuinely distinct sessions of one project in a day are not representable; only
  the peak commitment survives.
