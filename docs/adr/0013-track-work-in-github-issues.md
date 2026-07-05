# 0013 — Track work in GitHub Issues; retire the `tasks/` folder

- **Status:** accepted — supersedes ADR-0003 (its task-file tracking mechanism)
- **Date:** 2026-07-05
- **Related:** ADR-0003, `/bootstrap-issues` (issue #2)

## Context

ADR-0003 adopted an autonomous agent workflow whose work-tracking substrate was a `tasks/` folder:
one Markdown file per unit of work, moved `tasks/todo/` → `tasks/done/`, with a `PLAN.md` backlog.
That worked for a single agent building the app in sequence, but it has no atomic claim semantics:
two agents cannot safely see "who owns what" across parallel worktrees, and the backlog's
dependency order lived in prose, not a machine-readable graph.

The repo has since been bootstrapped for the **parallel-agent GitHub Issues queue**
(`/bootstrap-issues`): native `blocked-by` dependency edges, `ready`/`in-progress`/`review`/`blocked`
labels, an assignee-based claim, and a branch-protected `test` check that lets an agent self-merge.
With that in place, the `tasks/` folder and the Issues queue were two overlapping systems tracking
the same thing. Keeping both invites drift and ambiguity about which is authoritative.

## Decision

Work is tracked in **GitHub Issues on `origin`**, and only there. The `tasks/` folder (including
`todo/`, `done/`, `TEMPLATE.md`, `PLAN.md`, `README.md`) is deleted. Rule 1 of the operating manual
becomes **issue-first**: a `ready`-labelled Issue describes each unit of work, an agent claims it
(assign + `in-progress`), and it is done only when its PR (`Closes #<n>`) merges with verification
recorded. The dependency-ordered backlog that `PLAN.md` held is expressed as native GitHub
`blocked-by` edges between Issues instead.

The rest of ADR-0003's workflow stands: commit continuously on feature branches, record decisions as
ADRs, verify before done, keep docs current, use subagents. Only the tracking substrate changed.

## Consequences

- **Easier:** parallel agents get atomic claim semantics (assignee) and a mechanical ready-set
  computation (`ready` + unassigned + all blockers closed as `completed`); dependencies are a real
  graph; state is visible on `origin` without pulling the repo.
- **Easier:** no more `git mv` bookkeeping or a second place for work state to go stale.
- **Harder / risk:** work state now lives outside the repo, so a clone alone no longer shows the
  full history of what was done — that history is in closed Issues and merged PRs (and the completed
  `tasks/done/` records remain in git history up to this commit).
- **Follow-up:** authored via `/spec`, worked via `/start-next-issue`. The completed `tasks/done/`
  files (0001–0021) are preserved in git history; nothing is lost, only removed from the worktree.
- Rejected: keeping both systems (drift, ambiguous source of truth) and a read-only `tasks/`
  archive in-tree (dead weight that reads as still-authoritative).
