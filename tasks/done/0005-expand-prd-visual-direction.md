# 0005 - Expand PRD visual direction

- **Status:** done
- **Owner:** agent
- **Created:** 2026-07-02
- **Related:** PRD sections 3.1, 3.3, 7; ADR-0005, task-0005

## Goal

Update the PRD so the first implementation builds both a Notion-inspired month calendar and the
existing contribution heatmap, plus optional data-driven visualizations that can be evaluated and
pruned after seeing them with real data.

## Plan / checklist

- [x] Record the visual exploration decision in ADR-0005
- [x] Specify the Notion-inspired calendar and retention of the heatmap
- [x] Give the implementation agent bounded freedom to add useful visual flair and charts
- [x] Verification: inspect the rendered requirements and run repository documentation checks

## Verification

`git diff --check` passed. Targeted `rg` checks confirmed that the PRD requires both views,
contains the Notion Calendar visual target, requires at least two additional visualizations, and
includes visual exploration in the build phases. The CLAUDE.md to AGENTS.md symlink and ADR index
entry were also verified.

## Outcome

Updated the PRD's design principle, daily-log specification, monthly visual exploration guidance,
and build phases. The first pass now explicitly builds both the heatmap and Notion-inspired month
calendar, plus at least two modular real-data visualizations with accessibility and responsive
quality constraints. ADR-0005 records the decision to build competing views before pruning.
