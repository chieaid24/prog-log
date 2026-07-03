# CLAUDE.md — operating manual for this repo

This project is built to be run **autonomously by agents**. The human is a reviewer, not a driver.
Everything below exists so that any agent can cold-start, know the state of the world, do real
work, prove it, and leave a trail. **These rules are non-negotiable. Follow them exactly.**

> What we're building: a self-hosted daily work log (Next.js 15 + Supabase) with an "on this day"
> anniversary feed, a contribution-style heatmap, and zero-friction capture from a Discord bot and
> an Apple Shortcut. Full spec: **[`worklog-prd (1).md`](worklog-prd%20(1).md)** — the PRD is the
> source of truth for *what* to build (see §7 for the build phases).

---

## The six rules

### 1. Task-first — no work without a task
Before touching anything, create a task file in **`tasks/todo/`** (from `tasks/todo/TEMPLATE.md`).
Keep its checklist current as you go. When finished, fill in **Outcome** + **Verification** and
`git mv` it to **`tasks/done/`**. A task is done only when moved *and* verified. See
[`tasks/README.md`](tasks/README.md). One task = one coherent unit of work.

### 2. Commit continuously — do not ask permission
Commit after **each logical unit of work**, automatically, without pausing to ask. Do not batch a
day of work into one commit. Rules:
- Work on a **feature branch**, never directly on `main`. Open a PR when the task is done.
- When a worktree's work is done, **merge it back into `main` automatically** — don't wait to be
  asked. See **[Finishing a worktree](#finishing-a-worktree)** below.
- **Conventional Commits**, all lowercase, concise: `feat(scope): …`, `fix(scope): …`,
  `chore: …`, `docs: …`, `ci: …`.
- Reference the task in the body: `task: 0007`.
- **No AI attribution / no `Co-Authored-By` lines.** Commits are authored solely by the user.
- Before editing a file, check `git diff` for uncommitted human changes and preserve them.

### 3. Record design choices as ADRs
Every non-trivial decision (library, schema shape, boundary, PRD divergence, resolving a PRD open
question) gets an ADR in **`docs/adr/`** (from its `TEMPLATE.md`). ADRs are immutable once
accepted — supersede, never edit. Link the ADR from its task. See [`docs/adr/README.md`](docs/adr/README.md).

### 4. Verify before calling anything done
Never assert correctness — demonstrate it.
- **Every feature ships with a test.** A task that builds or changes a feature is not done until
  you have **written a test that exercises its Done gate and watched it pass** — unit for `lib/*`
  helpers and queries, component/integration for UI, a request test for API routes (e.g. Discord
  bad-signature → 401; `upsertEntry` keeps the peak `time_spent` and never erases a milestone).
  Code with no test is an incomplete task — no exceptions for "small" changes. Paste the passing
  output as the task's Verification evidence below.
- Run the full gate green before a task moves to `done/` (and before any PR):
  `npm run typecheck && npm run lint && npm run test && npm run build`.
- Each task's **Verification** section states the concrete check and records real evidence
  (command output, logs, a screenshot) before it moves to `done/`.
- CI (`.github/workflows/ci.yml`) runs lint → typecheck → test → build on every push/PR. It is
  bootstrap-tolerant now; **once `package.json` exists, those npm scripts must exist and pass.**
- Large/feature changes get real validation (run the dev server, exercise the flow), not just lint.

### 5. Document everything; keep docs current
Updating docs is part of "done", not a follow-up. When you change architecture, schema, tooling, or
workflow, update this file and the relevant doc **in the same task**. Docs live in [`docs/`](docs/).
Stale docs are a bug.

### 6. Use subagents liberally
Default to delegation. Fan out work instead of doing everything in one thread:
- **Parallel build.** Independent PRD phases / features → one subagent each, each owning its own
  task file and ADRs.
- **Focused research** (API shapes, library choice) and **noisy investigation** (log trawls, broad
  greps) → a subagent that returns only the conclusion, keeping the lead's context clean.
- The lead agent orchestrates (see below) and integrates; subagents execute.

---

## Finishing a worktree

When work in a git worktree is complete — all its tasks are in `tasks/done/` and per-task
verification passed — **merge it back into `main` automatically. Do not wait to be asked.**

1. Confirm the branch is committed clean (`git status`).
2. **Run the verification steps on the branch first** (CI gates / per-task checks). They must pass
   before merging.
3. **Merge into `main`, resolving any conflicts automatically** toward a correct integrated result:
   keep the intent of both sides and never drop committed work. Prefer a fast-forward; otherwise a
   merge commit. Preserve any uncommitted human changes in the `main` checkout.
4. **Re-run the verification steps on `main` after the merge.** A clean branch can still break on
   integration — the merge is not done until post-merge verification is green.
5. Clean up: remove the worktree and delete the merged branch.

Only stop and surface the situation if a conflict genuinely cannot be auto-resolved without losing
intent. Otherwise this is hands-off.

---

## Orchestration model

```
lead agent
  ├─ reads CLAUDE.md + PRD + tasks/todo, picks the next phase
  ├─ writes a task file per unit of work
  ├─ fans out subagents for independent work ──► each: own task, own ADRs, own verification
  ├─ integrates results, resolves conflicts
  └─ verifies (CI green + per-task checks) ──► moves tasks to done/, opens PR
```

Guidance for the lead:
- **Respect dependencies.** PRD §7 phases are roughly ordered: Foundation (schema/RLS) → Auth +
  project CRUD → Daily log core → Monthly breakdown → Anniversaries → Discord capture →
  Apple Shortcut → Polish. Parallelize only what is genuinely independent.
- **Define the contract before fan-out.** Shared types, the DB schema, and API route shapes are
  the seams between parallel agents — pin them (an ADR) before splitting work.
- **Integrate continuously.** Don't let branches drift; merge small and often.

---

## Verification pipeline

| Gate | Where | When |
|------|-------|------|
| `lint` | CI + local | every push/PR; pre-commit if practical |
| `typecheck` | CI + local | every push/PR |
| `test` | CI + local | every push/PR |
| `build` | CI | every push/PR |
| Per-task check | task file | before a task moves to `done/` |
| Manual/dev-server validation | local | feature & multi-file changes |

As the app is scaffolded, add the matching npm scripts (`lint`, `typecheck`, `test`, `build`) —
CI already invokes them via `npm run --if-present`, so the pipeline tightens automatically.

---

## Repo map

```
CLAUDE.md              ← you are here: the rules
worklog-prd (1).md     ← product spec (source of truth for what to build)
tasks/
  todo/                ← active work queue (+ TEMPLATE.md)
  done/                ← completed/verified work
docs/
  adr/                 ← architecture decision records (+ TEMPLATE.md)
  README.md            ← docs index
  RUNBOOK.md           ← go-live guide (accounts, secrets, wiring)
.github/workflows/
  ci.yml               ← verification pipeline
  keepalive.yml        ← supabase free-tier keep-alive ping
```

## Stack (from the PRD)

Next.js 15 (App Router) on Vercel Hobby · Supabase (Postgres + Auth, magic link) with RLS ·
Tailwind · Recharts/custom SVG · Discord Interactions API + Apple Shortcuts for capture ·
GitHub Actions cron keep-alive. Everything runs on free tiers. Use the Supabase **service role key
server-side only**; the browser uses the anon key + RLS.
