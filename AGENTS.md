# CLAUDE.md — operating manual for this repo

This project is built to be run **autonomously by agents**. The human is a reviewer, not a driver.
Everything below exists so that any agent can cold-start, know the state of the world, do real
work, prove it, and leave a trail. **These rules are non-negotiable. Follow them exactly.**

> What we're building: a self-hosted daily work log (Next.js 15 + Supabase) with an "on this day"
> anniversary feed, a contribution-style heatmap, and zero-friction capture from a Discord bot and
> an Apple Shortcut. Full spec: **[`worklog-prd (1).md`](worklog-prd%20(1).md)** — the PRD is the
> source of truth for *what* to build (see §7 for the build phases).

> **Status: not production-ready.** Do not share the live app URL anywhere yet (PRs, issues,
> commits, chat, external docs). It stays out of the GitHub repo's public homepage field and
> README. Lift this once the app is ready to show.

---

## The six rules

### 1. Issue-first — no work without a GitHub Issue
Work is tracked in **GitHub Issues on `origin`**, not a folder in this repo. Before touching
anything, make sure a `ready`-labelled Issue describes the unit of work (author it with `/spec`,
or `gh issue create` from the [task template](.github/ISSUE_TEMPLATE/task.md)). **Claim it before
you start:** assign yourself and move it `ready` → `in-progress`. Keep its acceptance criteria
current as you go. An Issue is **done** only when its PR (`Closes #<n>`) is merged with
verification recorded. One Issue = one coherent unit of work. Full mechanics:
[Parallel agent workflow](#parallel-agent-workflow) below.

### 2. Commit continuously — do not ask permission
Commit after **each logical unit of work**, automatically, without pausing to ask. Do not batch a
day of work into one commit. Rules:
- Work on a **feature branch**, never directly on `main`. Open a PR when the work is ready.
- When a worktree's work is done, **merge it back into `main` automatically** — don't wait to be
  asked. See **[Finishing a worktree](#finishing-a-worktree)** below.
- **Conventional Commits**, all lowercase, concise: `feat(scope): …`, `fix(scope): …`,
  `chore: …`, `docs: …`, `ci: …`.
- Reference the Issue in the body: `task: #7` (and put `Closes #7` in the PR to auto-close it).
- **No AI attribution / no `Co-Authored-By` lines.** Commits are authored solely by the user.
- Before editing a file, check `git diff` for uncommitted human changes and preserve them.

### 3. Record design choices as ADRs
Every non-trivial decision (library, schema shape, boundary, PRD divergence, resolving a PRD open
question) gets an ADR in **`docs/adr/`** (from its `TEMPLATE.md`). ADRs are immutable once
accepted — supersede, never edit. Link the ADR from its Issue/PR. See [`docs/adr/README.md`](docs/adr/README.md).

### 4. Verify before calling anything done
Never assert correctness — demonstrate it.
- **Every feature ships with a test.** An Issue that builds or changes a feature is not done until
  you have **written a test that exercises its acceptance criteria and watched it pass** — unit for
  `lib/*` helpers and queries, component/integration for UI, a request test for API routes (e.g.
  Discord bad-signature → 401; `upsertEntry` keeps the peak `time_spent` and never erases a
  milestone). Code with no test is incomplete — no exceptions for "small" changes. Paste the
  passing output as the PR's verification evidence.
- Run the full gate green before opening or merging any PR:
  `npm run typecheck && npm run lint && npm run test && npm run build`.
- The PR (and its Issue) states the concrete check and records real evidence (command output, logs,
  a screenshot) before it merges.
- CI (`.github/workflows/ci.yml`) runs lint → typecheck → test → build on every push/PR as the
  required `test` check; `main` is branch-protected on it, so a red gate cannot merge.
- Large/feature changes get real validation (run the dev server, exercise the flow), not just lint.

### 5. Document everything; keep docs current
Updating docs is part of "done", not a follow-up. When you change architecture, schema, tooling, or
workflow, update this file and the relevant doc **in the same PR**. Docs live in [`docs/`](docs/).
Stale docs are a bug.

### 6. Use subagents liberally
Default to delegation. Fan out work instead of doing everything in one thread:
- **Parallel build.** Independent PRD phases / features → one subagent each, each owning its own
  Issue and ADRs.
- **Focused research** (API shapes, library choice) and **noisy investigation** (log trawls, broad
  greps) → a subagent that returns only the conclusion, keeping the lead's context clean.
- The lead agent orchestrates (see below) and integrates; subagents execute.

---

## Finishing a worktree

When work in a git worktree is complete — its Issue's acceptance criteria are met and verification
passed — **merge it back into `main` automatically. Do not wait to be asked.**

1. Confirm the branch is committed clean (`git status`).
2. **Run the verification steps on the branch first** (CI gates / acceptance checks). They must pass
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
  ├─ reads CLAUDE.md + PRD + the GitHub Issues queue, picks the next ready issue
  ├─ opens/claims one Issue per unit of work
  ├─ fans out subagents for independent work ──► each: own Issue, own ADRs, own verification
  ├─ integrates results, resolves conflicts
  └─ verifies (CI green + acceptance criteria) ──► PR `Closes` the Issue, self-merges on green
```

Guidance for the lead:
- **Respect dependencies.** PRD §7 phases are roughly ordered: Foundation (schema/RLS) → Auth +
  project CRUD → Daily log core → Monthly breakdown → Anniversaries → Discord capture →
  Apple Shortcut → Polish. Model true dependencies as native GitHub `blocked-by` edges;
  parallelize only what is genuinely independent.
- **Define the contract before fan-out.** Shared types, the DB schema, and API route shapes are
  the seams between parallel agents — pin them (an ADR) before splitting work.
- **Integrate continuously.** Don't let branches drift; merge small and often.

---

## Verification pipeline

| Gate | Where | When |
|------|-------|------|
| `lint` | CI + local | every push/PR; pre-commit hook (`.githooks`) |
| `typecheck` | CI + local | every push/PR; pre-commit hook (`.githooks`) |
| `test` | CI + local | every push/PR (required check on `main`) |
| `build` | CI + local | every push/PR |
| Acceptance check | PR / Issue | before a PR merges |
| Manual/dev-server validation | local | feature & multi-file changes |

The CI job is named `test` and runs the full gate (lint → typecheck → test → build); it is the
required status check branch protection enforces on `main`. A lean local pre-commit hook mirrors
the fast half (lint + typecheck) — enable it once per clone with `git config core.hooksPath .githooks`.

---

## Repo map

```
CLAUDE.md              ← you are here: the rules (symlink → AGENTS.md)
worklog-prd (1).md     ← product spec (source of truth for what to build)
PRODUCT.md             ← strategic design context (register, users, personality)
DESIGN.md              ← binding design system (read before any UI change)
docs/
  adr/                 ← architecture decision records (+ TEMPLATE.md)
  README.md            ← docs index
  RUNBOOK.md           ← go-live guide (accounts, secrets, wiring)
.github/
  ISSUE_TEMPLATE/      ← agent task Issue template
  workflows/ci.yml     ← verification pipeline (required `test` check)
  workflows/keepalive.yml ← supabase free-tier keep-alive ping
```

> **Work is tracked in GitHub Issues on `origin`, not a folder in this repo.** The dependency-aware
> queue (labels, `blocked-by` edges, claim mutex, self-merge gate) is the [Parallel agent
> workflow](#parallel-agent-workflow). Author it with `/spec`; work it with `/start-next-issue`.

## Stack (from the PRD)

Next.js 15 (App Router) on Vercel Hobby · Supabase (Postgres + Auth, magic link) with RLS ·
Tailwind · Recharts/custom SVG · Discord Interactions API + Apple Shortcuts for capture ·
GitHub Actions cron keep-alive. Everything runs on free tiers. Use the Supabase **service role key
server-side only**; the browser uses the anon key + RLS.

---

## Parallel agent workflow

Work is a **dependency-aware GitHub Issues queue** (on `origin`), not a `/tasks` folder — issues give atomic claim semantics and state visible across parallel worktrees. Runs locally on **Claude Code or Codex CLI interchangeably**. Requires `gh` ≥ 2.94.0 (for `blockedBy`/`stateReason` JSON).

**Authoring the queue**
- Author the queue with `/spec`: it grills the idea, then routes by scope — a PRD with child slices for large features, or one or a few issues directly for small changes — one issue = one tracer-bullet vertical slice.
- **Dependencies are native GitHub `blocked-by` edges**, and **only model true logical dependencies** ("B needs A's code to exist"), never file contention. When unsure whether B depends on A, *add* the edge — a false edge just costs parallelism; a missing edge sends an agent to build on absent code.
- The human approves the dependency DAG once, up front; after that agents run with no per-issue human beat.

**The ready set** (pure mechanical read — no LLM, recompute freely)
- An issue is **ready** iff: labelled `ready`, **unassigned**, and every blocker is closed as `completed`.
- A blocker closed as `not_planned` does **not** unblock — it escalates its dependents to a human.

**Labels** (claim = assignee): `ready` → `in-progress` → `review` → `blocked`.

**File contention is NOT a dependency.** Two issues touching the same file run in parallel; the second PR to land rebases on `main` and re-runs CI. Don't serialize on predicted file overlap.

**`/start-next-issue` — the worker loop** (point each agent at this; it self-loops until stopped)
1. Read the ready set; pick the **most-blocking** issue (unblocks the most dependents; tiebreak lowest #).
2. **Claim atomically**: agents share one `gh` account, so the assignee alone can't distinguish two claimers — gate with an atomic local lock (`mkdir "$(git rev-parse --git-common-dir)/claim-locks/<issue#>"`). Winner re-reads inside the lock, assigns self, sets `in-progress`, releases; a loser drops it and takes the next.
3. Branch from fresh `main` → `<issue#>-<slug>`. One issue → one worktree → one PR with `Closes #<issue>`.
4. Code it, open the PR, then **babysit CI**: watch the `test` check; on a reproducible failure, fix on the branch, push, re-check. **Max 3 attempts** (flaky re-runs are free). Still red → write the failure into the issue, label `blocked`, and **stop the loop** (don't grab anything else).
5. On green it auto-merges (`gh pr merge <pr> --auto --squash --delete-branch`); prune the worktree, then loop to the next.
- **Empty ready set**: open issues remain → poll with backoff; queue fully drained → exit.
- **Stopped by usage limits**: leaves a paused `in-progress` claim (out of the ready set, so siblings ignore it) — resume that lane when limits reset.

**Merge gate**: `main` is branch-protected — the GitHub Actions `test` check is **required** with no required reviews, so an agent merges its own PR.

**Frontend / UI work**
- `DESIGN.md` (repo root) is the **binding design system** — every agent touching UI reads it first and conforms. A request that conflicts with it is flagged, not silently diverged from. It is committed and shared alongside `PRODUCT.md` (the strategic context) and this operating manual.
- Evolve the system by re-running the design interview and editing `DESIGN.md` in a PR — never fork design choices per feature.
- If `/impeccable` is installed, drive UI work through it (`/impeccable craft`, `critique`, `polish`, `document`); it auto-loads `DESIGN.md` from the repo root.
