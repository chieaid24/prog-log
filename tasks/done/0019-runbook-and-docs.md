# 0019 — Go-live runbook + docs sync

- **Status:** done
- **Owner:** agent (feat/v1-build run, lead)
- **Created:** 2026-07-03
- **Related:** PRD §5, §6; ADR-0002, ADR-0004; tasks 0012, 0014; every `.env.example` key

## Goal

A single `docs/RUNBOOK.md` that takes a human from this repo to the live product with no
guesswork: every manual step (Supabase project, migrations, auth, Vercel, domain, Discord
application + command registration, Apple Shortcut, GitHub Actions keep-alive) and every
secret, in order, with where-to-find-it detail. Plus: repo docs (docs/README.md index,
CLAUDE.md repo map) reflect the final architecture.

## Plan / checklist

- [x] `docs/RUNBOOK.md` — ordered go-live steps; env var table mapping every
      `.env.example` key to its source; cron caveat (fixed UTC vs stored timezone);
      keep-alive repo secrets; local dev section
- [x] `docs/README.md` — index the runbook
- [x] CLAUDE.md repo map — RUNBOOK + keepalive lines (via AGENTS.md, the symlink target)
- [x] Verification (below)

## Verification

Key-coverage cross-check (2026-07-03):

```
diff <(grep -oE "^[A-Z_]+" .env.example | sort) \
     <(grep -oE "`[A-Z_]{4,}`" docs/RUNBOOK.md | tr -d '`' | sort -u | ...)
→ zero .env.example keys missing from the runbook; the two runbook-only keys are the
  intentional GitHub Actions secrets (SUPABASE_URL, SUPABASE_ANON_KEY).
```

Wiring steps present for every shipped surface: /api/discord (§3), /api/log (§4),
/api/cron/digest (§2.4 + §3.6), keepalive.yml (§5), /now (§2.5, §8).

## Outcome

`docs/RUNBOOK.md` shipped: 0-to-live in 8 sections (local gate, Supabase, Vercel +
domain + cron, Discord app + command registration + digest webhook, Apple Shortcut,
keep-alive secrets, env reference table, local dev, post-launch checklist). Docs index
and repo map updated in the same task.
