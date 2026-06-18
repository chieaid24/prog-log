# Capture and the digest run in Next.js API routes, not Supabase Edge Functions

The Discord interactions endpoint, the Apple Shortcut endpoint, and the daily
anniversary digest all run as Next.js API routes on Vercel — the same deploy as
the web app — rather than as Deno Supabase Edge Functions. The daily digest uses
Vercel Cron (Hobby allows one run/day, which is exactly a daily digest).

We chose a single runtime to share one TypeScript library for project resolution
and the Entry upsert across the web quick-add and both capture paths, and to keep
one repo, one deploy, and one set of secrets. We gave up the Edge Functions'
proximity to Postgres and independence from frontend deploys; neither matters at
single-user scale.

## Consequences
- The service-role key lives as a Vercel server-side env var (never shipped to the
  browser, which uses the anon key + RLS).
- The PRD's section 4.1 Deno sketch is superseded and should be rewritten as a
  Next.js route handler.
