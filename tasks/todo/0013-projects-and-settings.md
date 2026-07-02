# 0013 — Project management + settings (B5 + timezone UI)

- **Status:** in progress
- **Owner:** agent (feat/v1-build run, lead)
- **Created:** 2026-07-02
- **Related:** `tasks/PLAN.md` (B5), PRD §3.5, ADR-0004 (manual timezone change needs a UI)

## Goal

List / create / edit / archive Projects (never delete — PRD 3.5): archiving drops a Project from
pickers while every Entry stays in history views. Plus the settings page ADR-0004 presupposes:
the stored timezone is "changed manually in settings", so settings must exist — timezone picker
writing `app_settings`, and sign-out.

## Plan / checklist

- [ ] `app/(log)/projects/page.tsx` — active + archived sections, per-project entry count and
      last-logged age from real Entries
- [ ] `components/projects/**` — create form (name, category, palette color), inline edit
      (rename/category/color), archive + un-archive via `setProjectStatusAction`
- [ ] `app/actions/settings.ts` — `updateTimezoneAction` (IANA-validated, upsert)
- [ ] `app/(log)/settings/page.tsx` — timezone select (Intl.supportedValuesOf), current value,
      save state, sign-out
- [ ] Tests: timezone validator unit; projects list component (archive calls action, edit saves,
      archived section separated); settings form component
- [ ] Verification (below)

## Verification

`npm run test && npm run typecheck && npm run lint` exit 0; paste summary.

## Outcome

(Filled on completion.)
