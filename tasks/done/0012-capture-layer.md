# 0012 — Capture layer: Discord /log, Apple Shortcut ingest, daily Throwback digest (E1 + G1 + D1)

- **Status:** done
- **Owner:** agent (capture fork, feat/v1-build run)
- **Created:** 2026-07-02
- **Related:** PRD §4, §8 (digest); ADR-0001, ADR-0002, ADR-0004; `tasks/PLAN.md` (E1, G1, D1)

## Goal

Zero-friction capture, all through the single shared write path (ADR-0001), all as Next.js API
routes (ADR-0002): a Discord interactions endpoint (Ed25519-verified, owner-only, autocomplete,
exact project resolution — never guesses), an Apple Shortcut bearer-secret ingest sharing the
same resolve+upsert path, and a Vercel-Cron daily digest that posts the day's top Throwback to a
Discord webhook — identical to the web feed's first card because both use the same date-seeded
pick.

## Plan / checklist

- [x] `lib/discord/verify.ts` — pure Ed25519 verification (tweetnacl), hex parsing hardened
- [x] `lib/discord/owner.ts` — admin-scoped owner fetches (active projects, throwback pool,
      timezone) + shared capture resolution error copy
- [x] `app/api/discord/route.ts` — 401 bad signature; PING→PONG; owner gate (commands and
      autocomplete); autocomplete type 8 ≤25 choices; `/log` resolve→upsertEntry→ephemeral
- [x] `app/api/log/route.ts` — constant-time bearer check; same resolve+upsert path; JSON
      responses with did-you-mean hints
- [x] `app/api/cron/digest/route.ts` — CRON_SECRET gate; empty pool = silent `{sent:false}`;
      webhook post with humanized age; `{sent:true}`
- [x] `vercel.json` — daily cron 12:00 UTC (= 08:00 America/Toronto)
- [x] `scripts/register-discord-command.mjs` — one-shot `/log` command registration
- [x] Request tests for all three routes (real tweetnacl keypair; mocked admin client + owner
      fetches; stubbed webhook fetch)
- [x] Verification (below)

## Verification

`npm run test && npm run typecheck && npm run lint && npm run build` all exit 0 in the worktree.
Route behaviors proven by tests: bad signature → 401; PING → PONG; non-owner → not authorized
(and empty autocomplete); owner `/log` exact match → upsert with owner id + ephemeral confirm;
unresolvable → near-match hint, no write; wrong shortcut bearer → 401 no write; invalid time →
400; wrong cron secret → 401; empty pool → no webhook call; non-empty → exactly one webhook call
whose content matches `pickThrowbacks(pool, today, 1)[0]`.

Evidence (worktree, 2026-07-03):

```
npm run typecheck   → tsc --noEmit, exit 0
npm run lint        → eslint ., exit 0
npm run test        → Test Files  13 passed (13) / Tests  104 passed (104)
                      (tests/api/{discord,log,digest}.test.ts cover every behavior above:
                       wrong-key signature, missing headers, tampered body → 401 no write;
                       PING→PONG; non-owner → ephemeral "not authorized" + empty autocomplete;
                       autocomplete filter/all/25-cap; owner exact match → upsertEntry with
                       owner id + flags 64; no-match hint with no write; invalid time; wrong
                       bearer/cron secret → 401; empty pool → {sent:false} no webhook; pick
                       content matches pickThrowbacks(pool, today, 1)[0]; failing webhook → 502)
npm run build       → compiled; /api/discord, /api/log, /api/cron/digest emitted as dynamic routes
```

Note (ADR-0004 caveat): Vercel Cron fires at a fixed UTC hour; 12:00 UTC is 08:00 in
America/Toronto (07:00 during standard time). Changing the stored timezone does not move the
cron — documented for the RUNBOOK.

## Outcome

The full capture layer shipped as Next.js API routes (ADR-0002), every write through the one
shared `upsertEntry` path (ADR-0001):

- **Discord `/log`** (`app/api/discord/route.ts`): Ed25519 verification (`lib/discord/verify.ts`,
  tweetnacl) before trusting a byte; PING→PONG; owner-id gate on commands *and* autocomplete;
  project autocomplete (≤25 choices, active Projects only); exact never-guess resolution with
  did-you-mean hints; ephemeral confirms. `scripts/register-discord-command.mjs` registers the
  command one-shot (PUT, idempotent; options: project/autocomplete, time/choices,
  milestone+description optional — matching the route contract).
- **Apple Shortcut ingest** (`app/api/log/route.ts`): constant-time bearer check
  (`lib/capture.ts`), same resolve+upsert path, JSON responses with hints.
- **Daily Throwback digest** (`app/api/cron/digest/route.ts` + `vercel.json` cron at 12:00 UTC):
  CRON_SECRET-gated; empty pool = silent `{sent:false}`; otherwise posts the exact
  `pickThrowbacks(pool, today, 1)[0]` card to the Discord webhook, so digest and web feed
  always agree.

Env contract documented in `.env.example`: `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN` (script
only), `DISCORD_APPLICATION_ID`, `DISCORD_OWNER_ID`, `OWNER_USER_ID`, `SHORTCUT_SECRET`,
`CRON_SECRET`, `DISCORD_DIGEST_WEBHOOK_URL`. RUNBOOK notes: registration is
`node --env-file=.env.local scripts/register-discord-command.mjs`, then paste the deployed
`/api/discord` URL into the Developer Portal's Interactions Endpoint URL; Vercel Cron fires at
fixed UTC (12:00 UTC = 08:00 EDT / 07:00 EST) and does not follow the stored timezone.
