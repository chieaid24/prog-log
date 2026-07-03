# 0017 — Project aliases: forgiving capture matching (stretch)

- **Status:** done
- **Owner:** agent (aliases fork, feat/v1-build run)
- **Created:** 2026-07-03
- **Related:** PRD §8 (stretch: aliases), PRD §4.1 (never guess), ADR-0010, ADR-0001

## Goal

`aim`, `ai-m`, `mental health` all resolve to one Project from Discord and the Apple
Shortcut: a `project_aliases` table (ADR-0010), aliases participating in capture
resolution and autocomplete as exact matches of their Project — with the never-guess
rule intact — plus alias management (add/remove chips) on `/projects`.

## Plan / checklist

- [x] ADR-0010: alias table shape (table vs jsonb column), resolution semantics
- [x] Migration `supabase/migrations/20260703000001_project_aliases.sql`: table, per-user
      case-insensitive unique alias, RLS mirroring projects; seed examples
- [x] `lib/database.types.ts`: `project_aliases` in the hand-maintained types
- [x] `lib/projects.ts`: pure `resolveProjectWithAliases` (alias exact-match = its
      Project; name+alias collision on different Projects = ambiguous; alias near-hits
      feed did-you-mean)
- [x] `lib/discord/owner.ts`: `getOwnerAliases` admin-scoped fetch
- [x] Wire Discord `/log` + autocomplete and Apple ingest through the alias-aware path
      (autocomplete surfaces the canonical Project name when an alias matches)
- [x] `/projects` UI: per-Project alias chips, add + remove; server actions with
      friendly duplicate-alias error
- [x] Tests: DB (uniqueness case-insensitive per user, RLS isolation), unit resolution,
      request (alias resolves via Discord + Apple, autocomplete alias hit), component
      (alias add/remove)
- [x] Verification (below)

## Verification

Full gate in the `aliases` worktree (2026-07-03), all exit 0:

```
npm run typecheck   → tsc --noEmit, exit 0
npm run lint        → eslint ., exit 0
npm run test        → Test Files  23 passed (23) / Tests  195 passed (195)
npm run build       → compiled successfully (routes unchanged)
```

Layer-by-layer pins: `tests/db/aliases.test.ts` (5: seed rows, case-insensitive
per-user unique, cross-user same alias OK, blank check, RLS isolation);
`tests/lib/projects.test.ts` (+8: alias match, name+alias union, collision →
ambiguous, archived-target inert, near-hint dedupe); `tests/api/discord.test.ts`
(+3: /log via alias with canonical confirm, collision stays ambiguous, autocomplete
surfaces canonical name); `tests/api/log.test.ts` (+2); component (+4: chips render,
add, remove, duplicate error, hidden on archived).

## Outcome

Capture matching is now forgiving without guessing: `project_aliases` (ADR-0010) with
DB-enforced per-user case-insensitive uniqueness; pure `resolveProjectWithAliases`
unions name and alias exact-matches by Project (one → match, several → ambiguous);
Discord `/log` + autocomplete and the Apple Shortcut resolve through it, always
answering with the canonical Project name; aliases managed as chips on `/projects`
(active Projects only — aliases are capture sugar and archived Projects leave the
candidate set). Seed ships `aim` and `mental health` → AI-M.
