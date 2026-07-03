# 0015 — CSV / JSON export + import (stretch)

- **Status:** in progress
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

- [ ] `lib/export.ts` — pure serializers (`entriesToCSV` with RFC-4180 escaping,
      `buildExportJSON` versioned envelope) and parsers (`parseImport`: JSON envelope or
      CSV with case-insensitive headers, per-row line-numbered errors)
- [ ] `app/api/export/route.ts` — GET `?format=csv|json`, session-gated (401 unauth),
      `Content-Disposition` attachment with dated filename
- [ ] `app/actions/data.ts` — `importEntriesAction(FormData)`: parse, resolve/create
      Projects (case-insensitive dedup via `createProject`), `upsertEntry` per row,
      summary { imported, projectsCreated, failed[] }
- [ ] `components/settings/data-section.tsx` — export buttons + import file form with
      result summary; wired into `/settings`
- [ ] ADR-0008: import goes through the shared write path (row-by-row, safe over fast)
- [ ] Tests: unit round-trip (CSV + JSON), CSV escaping (commas/quotes/newlines),
      malformed-row line errors; export route request test (401 unauth, csv/json bodies);
      data-section component test (import posts file, summary rendered)
- [ ] Verification (below)

## Verification

`npm run typecheck && npm run lint && npm run test && npm run build` all exit 0; paste
summary. Round-trip pinned by test: export → parse → identical normalized rows.

## Outcome

(Filled on completion.)
