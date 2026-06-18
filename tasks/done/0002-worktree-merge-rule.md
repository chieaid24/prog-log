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
- [x] Merge `worktree-autonomous-setup` into `main` (fast-forward) — blocker reconciled, see Outcome
- [x] Run verification on `main` post-merge (yaml parse, file presence, git log)
- [ ] Clean up worktree + branch — deferred (worktree may host an active session; remove on request)

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

Merged `worktree-autonomous-setup` into `main` via **fast-forward** (`fd828b8..47a179a`) — main was
0 ahead / 8 behind, so no merge commit and no history rewrite. The two blockers were reconciled:

1. **ADR number collision** — resolved upstream by renumbering the workflow ADR 0001 → 0003
   (commit f49a0e5); the domain ADRs 0001/0002 are now the accepted entries in
   `docs/adr/README.md`.
2. **Competing CLAUDE.md / TASKS.md from the parallel agent** — the human chose **"merge both"**.
   Realized as: the parallel session's *create-and-test gate* was folded into this CLAUDE.md
   (rule 4 now requires a passing test per feature), and its waved build plan was ported into the
   `tasks/` system as `tasks/PLAN.md` (the dependency-ordered backlog) with the two unblocked
   foundation units seeded as `tasks/todo/0003` and `0004`. The redundant root `TASKS.md` was
   removed; `CONTEXT.md` and the domain ADRs were kept. No committed or human work was dropped —
   the uncommitted `worklog-prd (1).md` edit (Telegram→Discord) survived the FF and is committed
   alongside.

Deferred only the worktree/branch cleanup, since the worktree may still host an active session.
