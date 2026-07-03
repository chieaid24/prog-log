# 0013 — Project management + settings (B5 + timezone UI)

- **Status:** done
- **Owner:** agent (feat/v1-build run, lead)
- **Created:** 2026-07-02
- **Related:** `tasks/PLAN.md` (B5), PRD §3.5, ADR-0004 (manual timezone change needs a UI)

## Goal

List / create / edit / archive Projects (never delete — PRD 3.5): archiving drops a Project from
pickers while every Entry stays in history views. Plus the settings page ADR-0004 presupposes:
the stored timezone is "changed manually in settings", so settings must exist — timezone picker
writing `app_settings`, and sign-out.

## Plan / checklist

- [x] `app/(log)/projects/page.tsx` — active + archived sections, per-project entry count and
      last-logged age from real Entries
- [x] `components/projects/**` — create form (name, category, palette color), inline edit
      (rename/category/color), archive + un-archive via `setProjectStatusAction`
- [x] `app/actions/settings.ts` — `updateTimezoneAction` (IANA-validated, upsert)
- [x] `app/(log)/settings/page.tsx` — timezone select (Intl.supportedValuesOf), current value,
      save state, sign-out
- [x] Tests: timezone validator unit; projects list component (archive calls action, edit saves,
      archived section separated); settings form component
- [x] Verification (below)

## Verification

Full gate on `feat/v1-build` (2026-07-03), after fixing vitest to exclude worktree test copies:

```
npm run typecheck   → tsc --noEmit, exit 0
npm run lint        → eslint ., exit 0
npm run test        → Test Files  12 passed (12) / Tests  82 passed (82)
npm run build       → compiled; /projects and /settings both emitted as dynamic routes
```

Covering tests: `tests/components/projects.test.tsx` (archive calls action, edit saves,
archived section separated), `tests/components/settings.test.tsx` (timezone select + save),
`tests/lib/timezones.test.ts` (IANA validation).

## Outcome

`/projects` lists active and archived Projects with per-project entry counts and last-logged
age; create (name, category, palette color), inline edit, archive/un-archive all through
`app/actions/projects.ts` — archive never deletes, Entries persist in history views (PRD 3.5).
`/settings` provides the ADR-0004-presupposed manual timezone picker (IANA-validated,
`Intl.supportedValuesOf`-driven, upserts `app_settings`) and sign-out. Shipped in commits
`e2583b1` (settings) and `a9bec0f` (projects).
