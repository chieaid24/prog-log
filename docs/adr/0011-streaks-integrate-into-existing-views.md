# 0011 — Streaks integrate into existing views; no separate streak view

- **Status:** accepted
- **Date:** 2026-07-03
- **Related:** PRD §8 (streaks + momentum stretch), PRD §9 (open question), task-0018

## Context

PRD §9 left one question open: do learning projects (Turkish, Mandarin) want a streak
view specifically, separate from work projects? The streak math itself shipped with the
data layer (`lib/streaks.ts`: `computeStreaks`, `computeMomentum` — pure, tested); the
open question is purely about surface area.

The PRD's core design principle (§1) is that the daily "pick project, tap size, done"
path stays trivial, and every added navigation destination competes with the three that
exist (Log, Monthly, Projects). Learning projects differ from work projects in one way
only: what matters is *unbroken daily cadence*, not output volume. That is a property of
the numbers shown, not of the page that shows them.

## Decision

No separate streak view. Streaks and momentum surface inside the existing dashboard as a
Momentum card in the aside: the global logging streak (current / longest / total days)
plus one row per recently-active Project with its cadence direction over two 14-day
windows (rising / steady / cooling) and its own current per-project streak. A
per-project streak of 2+ consecutive days renders visibly (that is the learning-project
signal — Turkish practiced 12 days running reads at a glance, next to the quick-add that
extends it).

The distinction is data-driven, not category-driven: any Project logged daily shows a
streak, whether it is a language or a codebase. No `category`-based special-casing.

## Consequences

- Zero new navigation; the answer to "am I keeping my Turkish streak alive?" lives on
  the same screen as the button that extends the streak — the shortest possible loop.
- Per-project streaks need all-time entry dates (a streak's `longest`/`totalDays` reach
  past the heatmap's year window), so the dashboard adds one lean all-time select of
  `(entry_date, project_id)` pairs — no joins, no text columns.
- If streak appetite grows (badges, per-project history graphs), the card can grow into
  a view later without migration — the math is already project-scoped.
- Rejected: a dedicated `/streaks` page (nav weight for one glanceable number);
  filtering streaks to `category = learning` (invents a category taxonomy the schema
  deliberately keeps free-form).
