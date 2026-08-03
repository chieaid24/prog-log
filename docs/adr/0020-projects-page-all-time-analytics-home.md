# 0020 - The Projects page is the all-time analytics home

- **Status:** accepted
- **Date:** 2026-08-03
- **Related:** PRD sections 3.3, 3.5; issue #62 (parent PRD #61); ADR-0005, ADR-0007

## Context

ADR-0005 deliberately shipped overlapping data views and deferred pruning until real data could
judge them. Every analytics surface so far is month-scoped (the Monthly breakdown) or
day/year-scoped (the log). There is no home for all-time questions - "where has my effort gone
across the life of each Project?" - and no per-Project surface at all. The Projects page,
meanwhile, is pure management (create / edit / archive, capture aliases) with no data on it.

## Decision

The Projects page becomes the **all-time analytics home**. A chart overview section sits at the
top of `/projects`, starting with an all-time Time Commitment-share donut across active Projects;
the management list stays below it on the same page. A per-Project detail route,
`/projects/[id]`, will be added as the drill-down from this overview. The Monthly breakdown stays
month-scoped: its project share answers "where did this month's effort go?", the Projects
overview answers the all-time form of the same question. All-time shares are computed by the same
pure TypeScript rollup as the monthly ones (`toProjectShares`, now scope-optional), per ADR-0007:
thin row fetch, aggregation in `lib`, no SQL view.

This resolves ADR-0005's "prune later" for the Projects surface by **adding an all-time surface
alongside the month-scoped one** rather than replacing or merging either: the two scopes answer
different questions, so both stay.

## Consequences

Time-scoped analytics have a clear address: month questions live on `/monthly`, all-time
questions on `/projects`, per-Project depth on `/projects/[id]`. Future all-time charts (the
overview comparison bar and streak strip, issue #63) slot into the overview section without a new
route. The Projects page now fetches all Entries (all-time, joined with Projects) on every load;
at a personal log's row counts that is cheap, and one fetch serves both the charts and the usage
summary - if it ever grows heavy, the fetch can thin to the columns the rollups read.
Rejected: a dedicated `/analytics` route (a third top-level surface splits attention and leaves
`/projects` as a bare admin page) and making the Monthly page scope-switchable (overloads one
view with two time frames and breaks its "one month at a glance" contract).
