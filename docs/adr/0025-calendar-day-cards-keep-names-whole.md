# 0025 — Calendar day-cards keep names whole: 700px grid floor, star replaces the size letter

- **Status:** accepted
- **Date:** 2026-08-15
- **Related:** PRD §3.1.2; issue #22 (deferred ui-audit finding UA-033); DESIGN.md responsive rules

## Context

At the calendar grid's 640px minimum width, day columns bottom out at ~91px and roughly half of
all day-card project names ellipsize at 390px (measured 37-54% across two fixture months); even at
1280px, where the `max-w-6xl` shell caps the calendar column at ~726px (~104px columns), cards that
carry both the milestone star and the S/M/L time letter still truncate ordinary names like
"Climbing". The calendar read as a wall of ellipses. Issue #22 offered three directions: wider
columns leaning on the existing horizontal scroll, dropping the per-card time badge at narrow
widths, or tooltips plus the day-detail panel. Tooltips alone cannot meet the acceptance bar
(names visibly untruncated), and hiding the badge everywhere discards logged data the
Mono-for-Measurement rule says to show.

Measured name widths for fixture-scale project names peak at ~49px (11px Hanken Grotesk,
"Climbing"/"prog-log"). Per-card chrome: ~49px with the letter, ~51px with the star, ~66px with
both. So 100px columns fit a name beside *either* extra, and only the star+letter combination
still truncates.

## Decision

Two coordinated changes to `MonthCalendar`:

- **Raise the grid floor from `min-w-[640px]` to `min-w-[700px]`** (100px columns). The calendar
  already lives in its own `overflow-x-auto` (DESIGN.md sanctions horizontal scroll for wide data
  surfaces); phones scroll ~9% further and every viewport from 390px up renders fixture months
  with zero truncated names. 700px stays under the ~726px column the shell allows at `lg`, so
  desktop gains no horizontal scroll.
- **A card shows at most one extra: the milestone star replaces the S/M/L letter.** Card extras
  rank name > star > letter, and the name never pays for both. A starred card's Time Commitment
  stays reachable through its `aria-label` and the day-detail panel, which is already the tap
  path for full detail. Non-milestone cards keep the letter at every viewport.

Cards also carry `title={projectName}` so hover pointers can read any name a future longer
project truncates.

## Consequences

- Fixture months render 0 truncated names (was 37-54% mobile) at 390/1280/1512, all badges
  visible on non-milestone cards; probe `UA-033.probe.mjs` pins this and fails on regression.
- Milestone cards no longer show the size letter anywhere. That is a deliberate information
  trade: the star is the rarer, higher-value signal, and the letter remains one tap (or one
  hover) away.
- Truly long project names will still ellipsize; the guarantee is calibrated to realistic
  name lengths (~9 characters at 11px), not unbounded ones. The `title` tooltip and day panel
  are the escape hatch.
- Rejected: container-query-gated badge (`@container` + `@min-[…px]:inline`) - the shell's
  `max-w-6xl` cap makes the "wide enough" state unreachable at `lg`, so the badge would
  effectively never show on desktop; always-on badge with the star swap achieves zero
  truncation with less machinery. Rejected: 812px+ grid floor - fixes truncation with both
  extras but forces sideways scroll on a 1280px desktop.
