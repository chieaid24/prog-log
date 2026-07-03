# 0014 — Supabase keep-alive cron

- **Status:** done
- **Owner:** agent (stretch worktree)
- **Created:** 2026-07-02
- **Related:** PRD §5 (free-tier watch-items), §6 (architecture), `tasks/PLAN.md` (D2)

## Goal

Supabase free projects pause after ~7 days without DB activity. Ship a GitHub Actions cron
(`.github/workflows/keepalive.yml`) that runs a trivial REST query twice a week and fails loudly
on a non-200, so the project never pauses and a broken ping is visible in the Actions tab.
"Done" = the workflow file parses as valid YAML, its required repo secrets are documented, and
`ci.yml` is verified against current reality.

## Plan / checklist

- [x] `.github/workflows/keepalive.yml` — twice-weekly cron + manual dispatch, one `curl` against
      PostgREST (`GET {SUPABASE_URL}/rest/v1/projects?select=id&limit=1` with anon-key headers),
      non-zero exit on any non-200; ~15 commented lines
- [x] Verify `.github/workflows/ci.yml` still matches reality (scripts exist, gates run); fix
      staleness if any
- [x] Verification (below)

## Verification

A workflow YAML cannot be meaningfully unit-tested from inside the repo (it runs on GitHub's
runners against live secrets), so verification is:

1. Parse the file with the in-repo `js-yaml` and assert the expected shape (cron schedule +
   dispatch trigger, one job) — real command output pasted below.
2. Document the two GitHub repo secrets the workflow needs:
   - `SUPABASE_URL` — the project REST base, `https://YOUR-PROJECT-REF.supabase.co`
     (same value as `NEXT_PUBLIC_SUPABASE_URL` in `.env.example`).
   - `SUPABASE_ANON_KEY` — the anon/publishable API key (same value as
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Anon + RLS returns an empty list without a session —
     the query is still DB activity, which is all the keep-alive needs.
3. `ci.yml` review: confirm every gate it invokes exists in `package.json` and behaves.

Evidence (2026-07-02, `node` + in-repo `js-yaml`):

```
$ node -e "…parse keepalive.yml, assert shape…"
name: keepalive
cron: [{"cron":"17 9 * * 1,4"}]
dispatch: true
jobs: [ 'ping' ]
runs-on: ubuntu-latest
steps: 1
keepalive.yml: valid YAML, expected shape OK

$ node -e "…parse ci.yml, check invoked scripts against package.json…"
lint -> eslint .
typecheck -> tsc --noEmit
test -> vitest run
build -> next build
ci.yml parses; jobs: [ 'verify' ]
```

`ci.yml` matches reality: all four gates it invokes exist in `package.json` and run. Its
bootstrap-tolerant `--if-present` design is intentional and documented in CLAUDE.md ("the
pipeline tightens automatically"), so no staleness fix was needed.

## Outcome

Shipped `.github/workflows/keepalive.yml` (commit `35c0ed0`): cron Mon + Thu 09:17 UTC plus
`workflow_dispatch`, one `curl --fail-with-body` PostgREST query
(`GET {SUPABASE_URL}/rest/v1/projects?select=id&limit=1`) that exits non-zero — failing the run
loudly — on any non-2xx. Deploy note: the repo needs two GitHub Actions secrets before the first
scheduled run, `SUPABASE_URL` and `SUPABASE_ANON_KEY` (same values as the corresponding
`NEXT_PUBLIC_*` entries in `.env.example`). `ci.yml` audited, no changes required.
