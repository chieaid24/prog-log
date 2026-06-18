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

- [ ] Add a "Finishing a worktree" section to `CLAUDE.md` + pointer from rule 2
- [ ] Verify CLAUDE.md still coherent (read back)
- [ ] Merge `worktree-autonomous-setup` into `main`, resolve conflicts automatically
- [ ] Run verification on `main` post-merge (yaml parse, file presence, git log)
- [ ] Clean up worktree + branch

## Verification

- Post-merge `git -C <main> log` shows the scaffolding commits on `main`.
- `ci.yml` parses and structure intact on `main`.
- No loss of the user's uncommitted `worklog-prd (1).md` edits in the main checkout.

## Outcome

(Filled on completion.)
