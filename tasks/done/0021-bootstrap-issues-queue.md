# 0021 — bootstrap parallel-agent GitHub Issues queue

- **Status:** done
- **Owner:** agent
- **Created:** 2026-07-05
- **Related:** `/bootstrap-issues` skill, DESIGN.md, PRODUCT.md

## Goal

Stand up the dependency-aware GitHub Issues workflow so several agents can each claim an issue,
work it in isolation, and self-merge through a required `test` CI check. Done = queue labels
exist, an agent issue template is committed, `main` is branch-protected on the `test` check with
auto-merge enabled, and the binding design context (PRODUCT.md + DESIGN.md) is committed.

## Plan / checklist

- [x] Design interview (`/impeccable teach`) → PRODUCT.md + DESIGN.md (new "Frog on a Log" light system)
- [x] Rename CI job `verify` → `test` (keep full lint/typecheck/test/build gate) so the required check matches
- [x] Add `.github/ISSUE_TEMPLATE/task.md`
- [x] Append the parallel-agent workflow section to AGENTS.md (coexists with the task-file flow; NOT gitignored — this repo checks its manual in)
- [x] Pre-commit hook mirroring CI (lint + typecheck), lean tracked `.githooks` — no Prettier
- [x] Create queue labels: `ready`, `in-progress`, `review`, `blocked`, `prd`
- [x] Commit, push branch, open PR, watch the `test` check go green, squash-merge
- [x] Enable auto-merge + delete-branch-on-merge; branch-protect `main` requiring `test`
- [x] Verification (below)

## Verification

- PR merged into `main` (state `MERGED`) with the `test` check green — paste the PR URL and check status.
- `gh label list` shows the five queue labels.
- `gh api repos/{owner}/{repo}/branches/main/protection` returns the `test` required check (or the
  manual-steps note if the token lacks Administration scope).
- `.github/` contains only `workflows/ci.yml` + `workflows/keepalive.yml` + `ISSUE_TEMPLATE/task.md` (no scratch scripts).

## Outcome

Bootstrapped the parallel-agent GitHub Issues queue on `chieaid24/prog-log`.

**Verification evidence (2026-07-05):**
- Local full gate before PR: `npm run typecheck && npm run lint && npm run test && npm run build` — exit 0 (build emitted all 10 routes).
- PR #1 (https://github.com/chieaid24/prog-log/pull/1): `test` check `pass` (~1m25s), state `MERGED` at 2026-07-05T20:46:08Z, remote branch auto-deleted.
- `gh label list` shows all five queue labels (`ready`, `in-progress`, `review`, `blocked`, `prd`).
- Branch protection on `main`: required checks `['test']`, required reviews `None`, `enforce_admins` false (owner bypass so agents self-merge via the check).
- Repo settings: `allow_auto_merge` and `delete_branch_on_merge` both true.
- `.github/` holds only `workflows/{ci.yml,keepalive.yml}` + `ISSUE_TEMPLATE/task.md` (no scratch scripts).
- Pre-commit hook self-tested: both bootstrap commits ran `npm run lint` + `npm run typecheck` via `.githooks/pre-commit`.

Fill the queue with `/spec`; work it with `/start-next-issue`.

### Divergences from the stock `/bootstrap-issues` skill (intentional)

- **CI**: kept the existing richer pipeline (lint + typecheck + test + build) and only renamed the
  job to `test`, rather than swapping in the thin `npm test`-only template. CLAUDE.md rule 4 mandates
  the full gate.
- **Docs**: did **not** gitignore or symlink-flip `CLAUDE.md`/`AGENTS.md`. This repo already checks
  them in (`AGENTS.md` real, `CLAUDE.md` → `AGENTS.md`), and the operating manual is meant to be
  shared. Appended the workflow section to the committed `AGENTS.md`.
- **DESIGN.md** is a **target**, not a scan of current code: the shipped UI still wears the old dark
  space theme; the new light "Frog on a Log" system is what future UI work moves toward. The redesign
  itself is a separate queued issue.
