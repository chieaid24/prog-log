# 0010 — Project aliases live in their own table and resolve like names

- **Status:** accepted
- **Date:** 2026-07-03
- **Related:** PRD §8 (stretch: aliases), PRD §4.1 (never guess), task-0017

## Context

Capture from Discord and the Apple Shortcut resolves Projects by typed name, and the
resolution rule is deliberately strict: exact case-insensitive match or nothing (PRD
§4.1 — never guess). That strictness fights fast capture: the Project is named `AI-M`
but muscle memory types `aim`; `Mental Health` gets typed as `mh`. The PRD's stretch
answer is aliases — extra names that map to one Project.

Two shapes were on the table: a `project_aliases` table, or an `aliases jsonb` (or
`text[]`) column on `projects`.

## Decision

A dedicated `project_aliases` table: `id`, `user_id` (default `auth.uid()`),
`project_id → projects`, `alias text`, with a **unique index on
`(user_id, lower(alias))`** and RLS identical to `projects`. The FK carries
`on delete cascade` for schema hygiene, though projects are archive-only (PRD 3.5) and
never deleted in practice.

A table wins over a jsonb column because the alias namespace is *per user, across all
Projects*: the same alias must never point at two Projects, and only
`unique (user_id, lower(alias))` lets Postgres enforce that. In jsonb the invariant
becomes application code — exactly the kind that silently breaks under concurrent
writes. Rows also give aliases identity (deletable by id from the UI) and an obvious
place for RLS.

Resolution semantics (pure, in `lib/projects.ts`): an alias exact-match counts as an
exact match of its Project. Name matches and alias matches are unioned by Project id —
if they collapse to one Project it resolves; if a name and someone else's alias
exact-match different Projects it is **ambiguous** (never guess, unchanged). Alias
substring hits join the near-match hints, deduplicated, surfaced under the canonical
Project name. Autocomplete surfaces a Project when its name *or* an alias matches the
typed prefix, always labeled with the canonical name — aliases are input sugar, never
output vocabulary.

## Consequences

- Easier: forgiving capture without weakening never-guess; alias CRUD from `/projects`
  is plain row insert/delete; the DB — not app code — guarantees one alias → one
  Project per user.
- Harder: capture resolution needs a second fetch (aliases alongside active Projects);
  the hand-maintained `lib/database.types.ts` grows a table (regenerate-and-diff once a
  live Supabase project exists, per ADR-0006).
- The web quick-add picker is unaffected — it selects Projects by id; aliases only
  matter where humans type free text (Discord, Shortcut).
- Rejected: `aliases jsonb` on `projects` (cross-row uniqueness unenforceable in the
  schema); fuzzy matching instead of aliases (violates PRD §4.1's never-guess rule).
