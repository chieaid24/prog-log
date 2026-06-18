# 0003 — Adopt an autonomous agent workflow

- **Status:** accepted
- **Date:** 2026-06-17
- **Related:** PRD (all phases), task-0001

## Context

This project (a Next.js + Supabase work log, see `/worklog-prd (1).md`) is intended to be built
and maintained largely by autonomous agents, with the human acting as reviewer rather than
driver. For that to work safely the repo needs guardrails that do not depend on a human being in
the loop: durable memory of *what* is being done and *why*, a way to prove changes are correct,
and a division of labor when work fans out.

Without structure, agent work drifts: decisions get re-litigated, half-finished work is invisible,
and "done" is asserted instead of demonstrated.

## Decision

Adopt four conventions, encoded as hard rules in the root `CLAUDE.md`:

1. **Task-first.** No work begins without a file in `tasks/todo/`; it moves to `tasks/done/`
   only after verification. This is the always-visible work queue.
2. **Decision log.** Non-trivial design choices are recorded as ADRs in `docs/adr/` (this folder),
   immutable once accepted and superseded rather than edited.
3. **Continuous commits.** Agents commit after each logical unit *without* asking permission,
   using conventional-commit messages and referencing the task id. Work stays on feature branches.
4. **Verification before done.** A bootstrap-tolerant CI pipeline plus a per-task verification
   section means correctness is demonstrated, never assumed.

Agents are also directed to use subagents liberally (parallel build phases, focused research,
noisy investigation) and to keep documentation current as part of "done."

## Consequences

- **Easier:** any agent can cold-start from `CLAUDE.md` + `tasks/` + `docs/adr/` and know the
  state of the world. Reviews are cheaper because intent is written down. Parallelism is safe
  because each subagent owns a task and records its own ADRs/verification.
- **Harder / cost:** more process overhead per change (a task file, sometimes an ADR). This is the
  intended trade — the project optimizes for autonomy and auditability over raw speed.
- **Follow-ups:** the CI pipeline is a stub while the app is unscaffolded; it must gain real
  lint/typecheck/build/test gates once `package.json` exists (tracked by a future task).
- **Alternatives rejected:** relying on an external tracker (Todoist/Notion/GitHub Issues) was
  rejected for v1 — in-repo task files are versioned with the code, diffable, and require no
  network or credentials, which matters for headless agents.
