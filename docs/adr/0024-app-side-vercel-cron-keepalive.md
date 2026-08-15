# 0024 — Supabase keep-alive runs as an app-side Vercel Cron

- **Status:** accepted
- **Date:** 2026-08-15
- **Related:** PRD §5 (free-tier watch-items), §8; supersedes the GitHub Actions keep-alive; issue #78, #5

## Context

Supabase Free pauses a project after ~7 days without DB activity, taking the app offline until
someone resumes it from the dashboard. The original mechanism (PRD §5) was
`.github/workflows/keepalive.yml`: a GitHub Actions cron that curls PostgREST twice a week with a
separate pair of repo secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).

Two properties of that mechanism are load-bearing failure modes for a project meant to run
untouched for years (its signature feature is a years-later anniversary feed):

- **GitHub disables scheduled workflows after ~60 days of repo inactivity.** A finished personal
  project goes quiet by design, so the keep-alive silently stops exactly when a dormant-but-live
  project depends on it — then the DB pauses 7 days later with no signal.
- **No alerting.** A failed ping only reddens an Actions tab nobody watches on a private repo.

The app already runs a Vercel Cron (`/api/cron/digest`) gated by `CRON_SECRET` and backed by the
service-role admin client, so the infrastructure to run a scheduled server-side DB query already
exists and is already configured in Vercel.

## Decision

We run the keep-alive as an app-side Vercel Cron. A new `/api/cron/keepalive` route does one
trivial `projects` read through the service-role admin client; `vercel.json` schedules it **daily**.
On a failed read it best-effort POSTs to the existing digest Discord webhook, then returns 500.
`.github/workflows/keepalive.yml` is removed.

- **Daily, not weekly.** The pause window is 7 days; a weekly cron equals it with zero margin, so a
  single skipped or delayed run pauses the DB. Daily costs the same on Vercel Hobby (2 crons total:
  digest + keepalive, the Hobby ceiling) and tolerates any single miss.
- **Service-role client, not anon PostgREST.** Reuses `createAdminClient()` and the Vercel env that
  already powers the digest, so no separate GitHub secrets. The anon `select on projects` grant from
  ADR-0012 is no longer needed *for the keep-alive* but stays, as it serves other reads.

## Consequences

- **Easier:** one keep-alive that cannot be auto-disabled by repo inactivity, reuses existing env,
  and surfaces failures to Discord instead of a silent red workflow. Config lives beside the code it
  protects. Flips the keep-alive from a `hitl` GitHub-secrets chore to `afk` code.
- **Harder / watch:** Vercel Hobby caps at 2 crons — this consumes the second slot, so a future
  third cron forces a consolidation or a plan change. Best-effort alerting reuses
  `DISCORD_DIGEST_WEBHOOK_URL`; if unset, a failure is a 500 with no ping (acceptable — the read
  still ran). A keep-alive of any flavor only *prevents* pausing; it cannot resume an
  already-paused project, so the one-time dashboard resume (and Vercel env confirmation) remains a
  human step (issue #5).
- **Rejected — keep GitHub Actions:** the 60-day auto-disable and absent alerting are exactly the
  silent multi-year failure modes this project cannot absorb.
- **Rejected — rely on the digest cron alone:** it already reads the DB daily, but returns 500
  *before* any read when `DISCORD_DIGEST_WEBHOOK_URL` is unset, coupling the keep-alive to Discord
  config. A dedicated single-responsibility route cannot be broken by digest changes.
- **Rejected — migrate to a non-pausing host (Neon) or Supabase Pro:** the durable architectural
  fix, but out of scope for an ops unblock; recorded here as the next step if the app graduates
  from "keep the free tier warm".
