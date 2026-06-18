# 0001 — Bootstrap autonomous agent workflow

- **Status:** done
- **Owner:** agent
- **Created:** 2026-06-17
- **Completed:** 2026-06-17
- **Related:** ADR-0003

## Goal

Stand up the operating rules and scaffolding that let agents run this project autonomously:
root `CLAUDE.md`, the `tasks/` lifecycle, the `docs/adr/` decision log, and a verification
pipeline. Done when an agent can read `CLAUDE.md` and execute a build phase end-to-end
without further human instruction.

## Plan / checklist

- [x] Create `tasks/` lifecycle (README, TEMPLATE, todo/done dirs)
- [x] Create `docs/adr/` (README, TEMPLATE) and record ADR-0003 for this workflow
- [x] Add bootstrap-tolerant CI verification pipeline (`.github/workflows/ci.yml`)
- [x] Write root `CLAUDE.md` encoding the rules (continuous commits, task-first, ADRs, subagents, orchestration, docs upkeep)
- [x] Add `docs/README.md` index
- [x] Verification (below)

## Verification

- `git log` shows continuous atomic commits, each referencing this task:
  `chore: add task lifecycle scaffolding` → `docs: add adr log…` → `ci: add bootstrap-tolerant
  verification pipeline` → `docs: add root claude.md…` → this completion commit.
- All directories present (verified via `find`): `tasks/todo`, `tasks/done`, `docs/adr`,
  `.github/workflows`.
- `ci.yml` parses (`python3 -c "import yaml; yaml.safe_load(...)"` → "ci.yml parses OK") and, with
  no `package.json` yet, the Detect-app step takes the bootstrap branch and skips build gates → job
  is green.

## Outcome

Established the autonomous-agent operating model. Created:
- `CLAUDE.md` — the six non-negotiable rules + orchestration model + verification table + repo map.
- `tasks/` — task-first lifecycle (`todo/` → `done/`) with README and TEMPLATE.
- `docs/adr/` — immutable decision log with README, TEMPLATE, and ADR-0003 (this decision).
- `.github/workflows/ci.yml` — bootstrap-tolerant pipeline that auto-tightens as npm scripts appear.
- `docs/README.md` — docs index.

Next: scaffold the Next.js app (PRD §7 phase 1, Foundation), which will activate the CI build gates.
