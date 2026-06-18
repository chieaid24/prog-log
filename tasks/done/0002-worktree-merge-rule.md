# 0002 — Auto-merge worktrees back to main

- **Status:** todo
- **Owner:** agent
- **Created:** 2026-06-17
- **Related:** CLAUDE.md rule 2, task-0001

## Goal

Encode in `CLAUDE.md` that finished worktrees are merged back into `main` automatically, with
conflicts auto-resolved and verification run both before and after the merge. Then exercise it by
merging this worktree into `main`.

## Plan / checklist

- [x] Add a "Finishing a worktree" section to `CLAUDE.md` + pointer from rule 2
- [x] Verify CLAUDE.md still coherent
- [ ] Merge `worktree-autonomous-setup` into `main`, resolve conflicts automatically — **BLOCKED**
- [ ] Run verification on `main` post-merge (yaml parse, file presence, git log)
- [ ] Clean up worktree + branch

## Blocker (2026-06-17)

A parallel process is actively editing the `main` checkout (files timestamped 21:45 that this
branch did not create):
- `CONTEXT.md` (untracked)
- `docs/adr/0001-entry-is-one-per-project-per-day.md` (untracked)
- `docs/adr/0002-capture-runs-in-nextjs-api-routes.md` (untracked)

Two problems: (1) **ADR-0001 number collides** — those are domain ADRs, this branch's 0001 is the
autonomous-workflow ADR; (2) merging moves `main` HEAD + working tree while another agent uses it.
The FF merge is non-destructive (preserves untracked files + the uncommitted PRD edit), but per the
new "Finishing a worktree" escape clause this is surfaced rather than auto-merged.

**Resolution (decided):** renumber my workflow ADR 0001 → 0003 (done in commit f49a0e5); merge now.

**Escalation:** before merging, the parallel agent also wrote an untracked **`CLAUDE.md`** and
**`TASKS.md`** into `main` — a complete competing autonomous setup (its CLAUDE.md, a waved build
plan, CONTEXT.md, domain ADRs). FF merge now refuses (would overwrite untracked `CLAUDE.md`).
Auto-clobbering a peer's uncommitted work violates "never drop committed/human work", so per the
escape clause this is surfaced for a reconcile decision rather than force-merged.

## Verification

- Post-merge `git -C <main> log` shows the scaffolding commits on `main`.
- `ci.yml` parses and structure intact on `main`.
- No loss of the user's uncommitted `worklog-prd (1).md` edits in the main checkout.

## Outcome

(Filled on completion.)
