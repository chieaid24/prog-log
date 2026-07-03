# 0015 — CSV / JSON export + import (stretch)

- **Status:** done
- **Owner:** agent (feat/v1-build run, lead)
- **Created:** 2026-07-03
- **Related:** PRD §8 (stretch: export/import, Notion migration path), ADR-0001, ADR-0008

## Goal

Get data out and in without friction or risk: download every Entry as CSV (flat,
spreadsheet-friendly) or JSON (versioned, full fidelity), and import either format back —
creating missing Projects and writing every row through the shared `log_entry` path so a
re-import can never destroy or downgrade existing data (ADR-0008). This is the migration
path out of the Notion prototype.

## Plan / checklist

- [x] `lib/export.ts` — pure serializers (`entriesToCSV` with RFC-4180 escaping,
      `buildExportJSON` versioned envelope) and parsers (`parseImport`: JSON envelope or
      CSV with case-insensitive headers, per-row line-numbered errors)
- [x] `app/api/export/route.ts` — GET `?format=csv|json`, session-gated (401 unauth),
      `Content-Disposition` attachment with dated filename
- [x] `app/actions/data.ts` — `importEntriesAction(FormData)`: parse, resolve/create
      Projects (case-insensitive dedup via `createProject`), `upsertEntry` per row,
      summary { imported, projectsCreated, failed[] }
- [x] `components/settings/data-section.tsx` — export buttons + import file form with
      result summary; wired into `/settings`
- [x] ADR-0008: import goes through the shared write path (row-by-row, safe over fast)
- [x] Tests: unit round-trip (CSV + JSON), CSV escaping (commas/quotes/newlines),
      malformed-row line errors; export route request test (401 unauth, csv/json bodies);
      data-section component test (import posts file, summary rendered)
- [x] Verification (below)

## Verification

Full gate on `feat/v1-build` (2026-07-03):

```
npm run typecheck   → tsc --noEmit, exit 0
npm run lint        → eslint ., exit 0 (after ignoring .claude/** worktree builds)
npm run test        → Test Files  15 passed (15) / Tests  99 passed (99)
npm run build       → compiled; ƒ /api/export emitted as dynamic route
```

Round-trip pinned in `tests/lib/export.test.ts` (CSV and JSON: export → parse →
identical normalized rows; RFC-4180 escaping; per-line errors keep good rows).
Route behavior pinned in `tests/api/export.test.ts` (401 unauth fetches nothing,
400 unknown format, CSV/JSON downloads). UI pinned in
`tests/components/data-section.test.tsx`.

## Outcome

Settings gained a Data section: CSV/JSON export via `GET /api/export` (session-gated,
RLS-scoped) and file import through `importEntriesAction`, which creates missing
Projects (case-insensitive, JSON metadata honored) and writes every row through
`upsertEntry` per ADR-0008 — re-import is idempotent, never downgrades. Header
aliases (`date`, `time commitment`, `notes`…) + `s/m/l` shorthands make Notion CSVs
import unedited. Also fixed eslint scanning worktree `.next` output (`.claude/**`
ignore).
