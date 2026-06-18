# 0001 — Bootstrap autonomous agent workflow

- **Status:** todo
- **Owner:** agent
- **Created:** 2026-06-17
- **Related:** ADR-0001

## Goal

Stand up the operating rules and scaffolding that let agents run this project autonomously:
root `CLAUDE.md`, the `tasks/` lifecycle, the `docs/adr/` decision log, and a verification
pipeline. Done when an agent can read `CLAUDE.md` and execute a build phase end-to-end
without further human instruction.

## Plan / checklist

- [ ] Create `tasks/` lifecycle (README, TEMPLATE, todo/done dirs)
- [ ] Create `docs/adr/` (README, TEMPLATE) and record ADR-0001 for this workflow
- [ ] Add bootstrap-tolerant CI verification pipeline (`.github/workflows/ci.yml`)
- [ ] Write root `CLAUDE.md` encoding the rules (continuous commits, task-first, ADRs, subagents, orchestration, docs upkeep)
- [ ] Add `docs/README.md` index
- [ ] Verification (below)

## Verification

- `git log` shows continuous atomic commits, each referencing this task.
- All directories present: `tasks/todo`, `tasks/done`, `docs/adr`, `.github/workflows`.
- `yamllint`/`actionlint` or a manual read confirms `ci.yml` is valid and green on a bootstrap
  repo (no `package.json` yet → skips build steps, exits 0).
- This file ends in `tasks/done/` with the Outcome filled in.

## Outcome

(Filled on completion.)
