# 0017 — Project aliases: forgiving capture matching (stretch)

- **Status:** in progress
- **Owner:** agent (aliases fork, feat/v1-build run)
- **Created:** 2026-07-03
- **Related:** PRD §8 (stretch: aliases), PRD §4.1 (never guess), ADR-0010, ADR-0001

## Goal

`aim`, `ai-m`, `mental health` all resolve to one Project from Discord and the Apple
Shortcut: a `project_aliases` table (ADR-0010), aliases participating in capture
resolution and autocomplete as exact matches of their Project — with the never-guess
rule intact — plus alias management (add/remove chips) on `/projects`.

## Plan / checklist

- [ ] ADR-0010: alias table shape (table vs jsonb column), resolution semantics
- [ ] Migration `supabase/migrations/*_project_aliases.sql`: table, per-user
      case-insensitive unique alias, RLS mirroring projects; seed examples
- [ ] `lib/database.types.ts`: `project_aliases` in the hand-maintained types
- [ ] `lib/projects.ts`: pure `resolveProjectWithAliases` (alias exact-match = its
      Project; name+alias collision on different Projects = ambiguous; alias near-hits
      feed did-you-mean)
- [ ] `lib/discord/owner.ts`: `getOwnerAliases` admin-scoped fetch
- [ ] Wire Discord `/log` + autocomplete and Apple ingest through the alias-aware path
      (autocomplete surfaces the canonical Project name when an alias matches)
- [ ] `/projects` UI: per-Project alias chips, add + remove; server actions with
      friendly duplicate-alias error
- [ ] Tests: DB (uniqueness case-insensitive per user, RLS isolation), unit resolution,
      request (alias resolves via Discord + Apple, autocomplete alias hit), component
      (alias add/remove)
- [ ] Verification (below)

## Verification

`npm run typecheck && npm run lint && npm run test && npm run build` all exit 0 in the
worktree; paste summary. Alias behavior pinned by tests at every layer (DB constraint,
pure resolution, both capture routes, UI).

## Outcome

(Filled on completion.)
