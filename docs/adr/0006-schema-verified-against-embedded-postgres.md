# 0006 — Schema verified against embedded Postgres, not the Docker Supabase stack

- **Status:** accepted
- **Date:** 2026-07-02
- **Related:** PRD §2; ADR-0001, ADR-0004; task-0004

## Context

Task 0004's verification assumed `supabase db reset` against the Supabase CLI's local Docker
stack. In this build environment Docker Desktop exists on the Windows host but WSL integration is
disabled, so the Linux Supabase CLI cannot reach a Docker daemon — and enabling integration is a
human-only action. Separately, even where Docker exists (CI), booting the full Supabase stack for
every test run is slow and couples the automated suite to a ~10-container runtime it barely uses.

## Decision

Automated schema and query verification runs against a real Postgres 17 booted per test run by
the `embedded-postgres` npm package (official Postgres binaries, unprivileged, no Docker). A
vitest global setup (`tests/db/global-setup.ts`) applies, in order: a minimal Supabase auth shim
(`auth` schema, `auth.users`, `auth.uid()` reading the JWT-sub GUC, an RLS-constrained
`authenticated` role — `tests/db/auth-shim.sql`), every migration in `supabase/migrations/`
sorted exactly as the Supabase CLI applies them, Supabase-equivalent grants, and `seed.sql`.

The `supabase/` directory stays in standard CLI layout (`config.toml`, `migrations/`, `seed.sql`)
so `supabase db reset` remains the path for humans and for pushing to the real project.

## Consequences

- Tests exercise real Postgres semantics — enum ordering under `greatest()`, RLS with
  `set role authenticated`, partial indexes, `on conflict` — with a ~1s boot, in WSL and CI alike.
- The auth shim is a simplification of Supabase's `auth.users` (id + email only) and must not
  drift into pretending to test Supabase Auth itself; magic-link flows are verified separately.
- If a migration ever uses a Supabase-specific extension beyond the shim's surface, the shim must
  grow with it, or that migration gains a Docker-based check.
- Postgres major (17) is pinned to match Supabase's current default; bump both together.
