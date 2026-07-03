# 0012 — Table privileges are granted explicitly in migrations

- **Status:** accepted
- **Date:** 2026-07-03
- **Related:** task-0020, ADR-0006

## Context

Manual validation against the local Supabase stack surfaced `permission denied for table
entries` for `service_role`. Current Supabase Postgres images no longer hand the PostgREST
API roles (`anon`, `authenticated`, `service_role`) DML on newly created tables by default —
the platform's historical default-privilege behavior cannot be relied on. The test harness
had been papering over this with a blanket `grant all … to authenticated` applied after
migrations, so the gap was invisible to CI while real stacks failed.

## Decision

We carry table- and function-level grants for the API roles explicitly in migrations
(`20260703000002_role_grants.sql` for the existing surface). Every future migration that
creates a table or PostgREST-exposed function must grant its own access in the same file.
RLS remains the row-level isolation boundary; grants are only the table-level gate. The
test harness applies **no** grants of its own — the embedded-Postgres suite (ADR-0006)
creates `anon` / `authenticated` / `service_role` (with `bypassrls`) as bare roles and runs
the real migrations, so the tests exercise exactly the grants production gets.

## Consequences

- A forgotten grant now fails loudly in the DB test suite instead of only on a live stack.
- `anon` deliberately gets nothing beyond `select` on `projects` (the keep-alive ping;
  RLS yields zero rows) — the public `/now` page reads via `service_role` (ADR-0009), so
  no anon surface widens by default.
- Rejected: keeping grants in the test harness or a post-deploy script — both drift from
  what migrations produce and hide exactly the class of failure this ADR exists to prevent.
