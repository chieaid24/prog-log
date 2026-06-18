# 0002 — Capture and the digest run in Next.js API routes, not Edge Functions

- **Status:** accepted
- **Date:** 2026-06-17
- **Related:** PRD §4 (capture), §6 (architecture); ADR-0001, ADR-0004

## Context

The PRD hedged between a Supabase Edge Function (Deno) and a Next.js API route for
the Discord endpoint, the Apple Shortcut endpoint, and the daily Throwback digest.
The web app is already Next.js on Vercel, so the runtime for the server-side capture
paths was an open fork affecting deploy target, language, and how the digest is
scheduled.

## Decision

The Discord interactions endpoint, the Apple Shortcut endpoint, and the daily
Throwback digest all run as Next.js API routes on Vercel — the same deploy as the web
app — not as Deno Edge Functions. The digest uses Vercel Cron (Hobby allows one
run/day, exactly a daily digest).

## Consequences

- One TypeScript library for project resolution and the `log_entry` upsert is shared
  across the web quick-add and both capture paths; one repo, one deploy, one set of
  secrets.
- We gave up Edge Functions' proximity to Postgres and independence from frontend
  deploys; neither matters at single-user scale.
- The service-role key lives as a Vercel server-side env var, never shipped to the
  browser (which uses the anon key + RLS).
- The PRD §4.1 Deno sketch has been rewritten as a Next.js route handler.
