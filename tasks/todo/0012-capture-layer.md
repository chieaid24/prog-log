# 0012 — Capture layer: Discord /log, Apple Shortcut ingest, daily Throwback digest (E1 + G1 + D1)

- **Status:** in progress
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
- [ ] `app/api/log/route.ts` — constant-time bearer check; same resolve+upsert path; JSON
      responses with did-you-mean hints
- [ ] `app/api/cron/digest/route.ts` — CRON_SECRET gate; empty pool = silent `{sent:false}`;
      webhook post with humanized age; `{sent:true}`
- [ ] `vercel.json` — daily cron 12:00 UTC (= 08:00 America/Toronto)
- [ ] `scripts/register-discord-command.mjs` — one-shot `/log` command registration
- [ ] Request tests for all three routes (real tweetnacl keypair; mocked admin client + owner
      fetches; stubbed webhook fetch)
- [ ] Verification (below)

## Verification

`npm run test && npm run typecheck && npm run lint && npm run build` all exit 0 in the worktree.
Route behaviors proven by tests: bad signature → 401; PING → PONG; non-owner → not authorized
(and empty autocomplete); owner `/log` exact match → upsert with owner id + ephemeral confirm;
unresolvable → near-match hint, no write; wrong shortcut bearer → 401 no write; invalid time →
400; wrong cron secret → 401; empty pool → no webhook call; non-empty → exactly one webhook call
whose content matches `pickThrowbacks(pool, today, 1)[0]`.

Note (ADR-0004 caveat): Vercel Cron fires at a fixed UTC hour; 12:00 UTC is 08:00 in
America/Toronto (07:00 during standard time). Changing the stored timezone does not move the
cron — documented for the RUNBOOK.

## Outcome

(Filled on completion.)
