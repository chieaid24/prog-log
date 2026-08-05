# 0023 — The monthly view becomes the Progress timeline

- **Status:** accepted
- **Date:** 2026-08-05
- **Related:** PRD §3.3, issue #60, ADR-0007, ADR-0011, ADR-0017

## Context

The monthly view answered "how did I spend my month?" with charts, but the log's most
rewarding material — Reflection sentences and Milestones, the immeasurables — had no
deliberate chronological browse. Throwback (PRD 3.4) resurfaces them serendipitously on
the dashboard; nothing let the owner read the story back on purpose. Meanwhile the
monthly charts still earn their keep and the heatmap already answers "did I show up",
so a plain logged day carries no narrative weight.

## Decision

`/monthly` becomes `/progress` (a permanent redirect forwards the old route and its
`?month=` param; nav reads "Progress"). The page leads with the qualitative record:

- **Progress timeline (the hero):** all-time, newest first, one moment per day that has
  a Reflection or at least one Milestone. Plain Time-Commitment-only days are omitted.
  Each moment leads with the Reflection, lists Milestones with their Project chips, and
  folds the day's other Entries into quiet metadata. Headers run relative near the top
  ("This week", "This month") and month + year going back. An initial window of 10
  moments loads first with client-side load-more reaching through all history.
- **Cumulative overview (top):** current + longest streak (reusing `computeStreaks`,
  ADR-0011) beside a monotonic cumulative-effort curve — the running sum of
  `TIME_WEIGHT` (Small/Medium/Large -> 1/2/3) from the first logged day through today.
- **Monthly analytics (below, unchanged):** the stat tiles, effort trend, project
  stack, project share, weekday pattern, milestone list and prev/next-month nav are
  retained as the secondary "by the numbers" section.

Sources follow the established seams: one all-time `getAllEntries` fetch feeds the
timeline, the curve, the streaks and the retained monthly charts (pure prep in
`components/progress/prepare.ts`, ADR-0007); Reflections come from the Throwback pool
(ADR-0017) queried with a tomorrow cutoff so today's Reflection is included — no new
query shape and no demo-fixture change.

## Consequences

- The qualitative record gains a deliberate browse; Throwback on the dashboard stays
  the serendipitous resurface of the same material. Emphasis flips to Reflections and
  Milestones without losing any existing chart.
- The page now fetches all Entries ever instead of a two-month window. At a
  single-user scale of a few Entries per day this stays small for years; if it ever
  drags, the timeline's load-more is the natural seam to move pagination server-side.
- Load-more is a client-side reveal over fully-prepared moments, so pagination is a
  pure function (`visibleMoments`) rather than query plumbing.
- `/monthly` links keep working via the redirect; internal links and the nav point at
  `/progress`.
- Rejected: a separate `/progress` page alongside `/monthly` (two homes for "look
  back" would dilute both); cumulative *days* instead of cumulative effort (a day
  count flattens Small vs Large and the streak numbers already count days).
